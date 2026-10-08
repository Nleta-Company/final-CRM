import {
  BdeItem,
  CreateBdeInput,
  UpdateBdeInput,
  BdeStats,
  BdeStatus,
} from "@/types/bde";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000/api"
).replace(/\/+$/, "");

const BDES_CHANGE_EVENT = "nleta_bdes_updated";

export function formatINR(val: number): string {
  return "₹ " + val.toLocaleString("en-IN");
}

interface BackendUser {
  id: string;
  firstName: string;
  lastName?: string | null;
  email: string;
  mobile?: string | null;

  designation?: string | null;
  region?: string | null;

  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  lastLoginAt?: string | null;
  createdAt: string;

  role?: {
    name: string;
  } | null;
}

interface UsersApiResponse {
  success: boolean;
  message?: string;
  data?: {
    users: BackendUser[];
    total: number;
  };
}

interface UserApiResponse {
  success: boolean;
  message?: string;
  data?: {
    user: BackendUser;
  };
}

function getAuthToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return (
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("authToken")
  );
}

function getHeaders(): HeadersInit {
  const token = getAuthToken();

  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {}),
  };
}

function ensureAuth() {
  if (!getAuthToken()) {
    throw new Error(
      "Authentication token is missing. Please login again."
    );
  }
}

/**
 * Backend User status -> CRM BDE status
 */
function mapUserStatus(
  status: BackendUser["status"]
): BdeStatus {
  switch (status) {
    case "ACTIVE":
      return "Active";

    case "INACTIVE":
    case "SUSPENDED":
      return "Inactive";

    default:
      return "Inactive";
  }
}

/**
 * Backend User -> BdeItem
 *
 * designation and region come directly from database.
 * No hardcoded/default fake values are used.
 */
function mapUserToBde(user: BackendUser): BdeItem {
  const fullName = `${user.firstName} ${
    user.lastName || ""
  }`.trim();

  return {
    id: user.id,

    employeeCode: user.id,

    fullName,

    email: user.email,

    phone: user.mobile || "",

    designation: user.designation || "",

    region: user.region || "",

    status: mapUserStatus(user.status),

    quarterlyTarget: formatINR(0),

    numericTarget: 0,

    achievedRevenue: formatINR(0),

    numericAchieved: 0,

    conversionRate: 0,

    activeLeadsCount: 0,

    closedDealsCount: 0,

    joinedDate: user.createdAt
      ? user.createdAt.split("T")[0]
      : "",

    notes: "",
  };
}

class BdeService {
  /**
   * --------------------------------------------------
   * GET ALL BDE
   * --------------------------------------------------
   */
  public async getAllBdes(): Promise<BdeItem[]> {
    ensureAuth();

    const response = await fetch(
      `${API_BASE_URL}/users`,
      {
        method: "GET",
        headers: getHeaders(),
        credentials: "include",
        cache: "no-store",
      }
    );

    let result: UsersApiResponse | null = null;

    try {
      result =
        (await response.json()) as UsersApiResponse;
    } catch {
      result = null;
    }

    if (!response.ok) {
      throw new Error(
        result?.message ||
          "Unable to fetch BDE/Sales users."
      );
    }

    const users =
      result?.data?.users || [];

    return users
      .filter(
        (user) =>
          user.role?.name === "BDE/Sales"
      )
      .map(mapUserToBde);
  }

  /**
   * --------------------------------------------------
   * GET BDE BY ID
   * --------------------------------------------------
   *
   * Backend does not currently have GET /users/:id.
   * So fetch all users and find selected BDE.
   */
  public async getBdeById(
    id: string
  ): Promise<BdeItem | null> {
    const bdes =
      await this.getAllBdes();

    return (
      bdes.find(
        (bde) => bde.id === id
      ) || null
    );
  }

  /**
   * --------------------------------------------------
   * CREATE BDE
   * --------------------------------------------------
   *
   * Actual account creation is handled by
   * BdeForm -> POST /users because password
   * is required by backend.
   */
  public async createBde(
    _input: CreateBdeInput
  ): Promise<BdeItem> {
    throw new Error(
      "BDE account creation must use the user account API because password is required by the backend."
    );
  }

  /**
   * --------------------------------------------------
   * UPDATE BDE
   * --------------------------------------------------
   */
  public async updateBde(
    id: string,
    input: UpdateBdeInput
  ): Promise<BdeItem> {
    ensureAuth();

    const payload: {
      firstName?: string;
      lastName?: string;
      email?: string;
      mobile?: string;
      designation?: string;
      region?: string;
      role?: "BDE/Sales";
    } = {};

    /**
     * BdeItem uses fullName.
     *
     * Convert fullName -> firstName + lastName.
     */
    if (
      input.fullName !== undefined
    ) {
      const nameParts =
        input.fullName
          .trim()
          .split(/\s+/);

      payload.firstName =
        nameParts[0] || "";

      payload.lastName =
        nameParts
          .slice(1)
          .join(" ");
    }

    /**
     * Email
     */
    if (
      input.email !== undefined
    ) {
      payload.email =
        input.email
          .trim()
          .toLowerCase();
    }

    /**
     * Frontend phone -> backend mobile
     */
    if (
      input.phone !== undefined
    ) {
      payload.mobile =
        input.phone.trim();
    }

    /**
     * Designation
     */
    if (
      input.designation !== undefined
    ) {
      payload.designation =
        input.designation.trim();
    }

    /**
     * Sales Territory / Region
     */
    if (
      input.region !== undefined
    ) {
      payload.region =
        input.region.trim();
    }

    /**
     * Keep account as BDE/Sales.
     */
    payload.role = "BDE/Sales";

    const response = await fetch(
      `${API_BASE_URL}/users/${encodeURIComponent(id)}`,
      {
        method: "PUT",
        headers: getHeaders(),
        credentials: "include",
        body: JSON.stringify(payload),
      }
    );

    let result: UserApiResponse | null = null;

    try {
      result =
        (await response.json()) as UserApiResponse;
    } catch {
      result = null;
    }

    if (!response.ok) {
      throw new Error(
        result?.message ||
          "Unable to update BDE/Sales account."
      );
    }

    if (!result?.data?.user) {
      throw new Error(
        "BDE account updated but no user data was returned."
      );
    }

    const updatedBde =
      mapUserToBde(
        result.data.user
      );

    this.notifyChange();

    return updatedBde;
  }

  /**
   * --------------------------------------------------
   * DELETE BDE
   * --------------------------------------------------
   *
   * Backend has no DELETE /users/:id.
   * Deactivate account instead.
   */
  public async deleteBde(
    id: string
  ): Promise<boolean> {
    await this.updateBdeStatus(
      id,
      "INACTIVE"
    );

    return true;
  }

  /**
   * --------------------------------------------------
   * UPDATE STATUS
   * --------------------------------------------------
   */
  public async updateBdeStatus(
    id: string,
    status:
      | "ACTIVE"
      | "INACTIVE"
      | "SUSPENDED"
  ): Promise<BdeItem> {
    ensureAuth();

    const response = await fetch(
      `${API_BASE_URL}/users/${encodeURIComponent(id)}/status`,
      {
        method: "PATCH",
        headers: getHeaders(),
        credentials: "include",
        body: JSON.stringify({
          status,
        }),
      }
    );

    let result: UserApiResponse | null = null;

    try {
      result =
        (await response.json()) as UserApiResponse;
    } catch {
      result = null;
    }

    if (!response.ok) {
      throw new Error(
        result?.message ||
          "Unable to update BDE status."
      );
    }

    if (!result?.data?.user) {
      throw new Error(
        "BDE status updated but no user data was returned."
      );
    }

    const updatedBde =
      mapUserToBde(
        result.data.user
      );

    this.notifyChange();

    return updatedBde;
  }

  /**
   * --------------------------------------------------
   * STATS
   * --------------------------------------------------
   */
  public async getBdeStats(): Promise<BdeStats> {
    const bdes =
      await this.getAllBdes();

    let totalTarget = 0;
    let totalAchieved = 0;
    let totalConversion = 0;

    const statusBreakdown: Record<
      BdeStatus,
      number
    > = {
      Active: 0,
      "On Leave": 0,
      Probation: 0,
      Inactive: 0,
    };

    bdes.forEach((bde) => {
      totalTarget +=
        bde.numericTarget || 0;

      totalAchieved +=
        bde.numericAchieved || 0;

      totalConversion +=
        bde.conversionRate || 0;

      if (
        statusBreakdown[bde.status] !==
        undefined
      ) {
        statusBreakdown[bde.status]++;
      }
    });

    const averageConversionRate =
      bdes.length > 0
        ? Math.round(
            totalConversion /
              bdes.length
          )
        : 0;

    return {
      totalExecutives:
        bdes.length,

      activeExecutives:
        statusBreakdown.Active || 0,

      totalTarget,

      totalAchieved,

      formattedTotalRevenue:
        formatINR(totalAchieved),

      formattedTotalTarget:
        formatINR(totalTarget),

      averageConversionRate,

      statusBreakdown,
    };
  }

  /**
   * --------------------------------------------------
   * SUBSCRIBE
   * --------------------------------------------------
   */
  public subscribe(
    listener: () => void
  ): () => void {
    if (
      typeof window === "undefined"
    ) {
      return () => {};
    }

    window.addEventListener(
      BDES_CHANGE_EVENT,
      listener
    );

    return () => {
      window.removeEventListener(
        BDES_CHANGE_EVENT,
        listener
      );
    };
  }

  /**
   * --------------------------------------------------
   * NOTIFY
   * --------------------------------------------------
   */
  public notifyChange(): void {
    if (
      typeof window === "undefined"
    ) {
      return;
    }

    window.dispatchEvent(
      new Event(BDES_CHANGE_EVENT)
    );
  }
}

export const bdeService =
  new BdeService();