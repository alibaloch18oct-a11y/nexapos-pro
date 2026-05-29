const fs = require("fs");
const path = require("path");

const root = "D:\\ShazeeProjects\\nexapos-pro";
const roleRoutes = path.join(root, "backend", "src", "routes", "roleAccessRoutes.js");

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function write(file, content) {
  fs.writeFileSync(file, content, "utf8");
}

function backup(file) {
  fs.copyFileSync(file, `${file}.backup-before-role-authorities-${Date.now()}`);
}

backup(roleRoutes);

let code = read(roleRoutes);

if (!code.includes("function strictPermissionsForRole")) {
  code = code.replace(
    "function defaultPermissions(role) {",
    `function strictPermissionsForRole(role, extra = {}) {
  const canEditOrders = Boolean(extra.canEditOrders);

  const map = {
    owner: {
      label: "Restaurant Owner",
      canSwitchBranches: true,
      canViewAllBranches: true,
      canManageBranches: true,
      canManageUsers: true,
      canViewCosts: true,
      canViewProfitLoss: true,
      canViewPurchases: true,
      canViewReports: true,
      canEditOrders: true,
      canRefundOrders: true,
      canManageMenu: true,
      canManageInventory: true,
      canUsePOS: true,
      canUseKDS: true,
      canUseDelivery: true
    },
    branch_manager: {
      label: "Branch Manager",
      canSwitchBranches: false,
      canViewAllBranches: false,
      canManageBranches: false,
      canManageUsers: true,
      canViewCosts: false,
      canViewProfitLoss: false,
      canViewPurchases: false,
      canViewReports: true,
      canEditOrders: true,
      canRefundOrders: false,
      canManageMenu: true,
      canManageInventory: true,
      canUsePOS: true,
      canUseKDS: true,
      canUseDelivery: true
    },
    cashier: {
      label: "Cashier",
      canSwitchBranches: false,
      canViewAllBranches: false,
      canManageBranches: false,
      canManageUsers: false,
      canViewCosts: false,
      canViewProfitLoss: false,
      canViewPurchases: false,
      canViewReports: false,
      canEditOrders,
      canRefundOrders: false,
      canManageMenu: false,
      canManageInventory: false,
      canUsePOS: true,
      canUseKDS: false,
      canUseDelivery: false
    },
    waiter: {
      label: "Waiter",
      canSwitchBranches: false,
      canViewAllBranches: false,
      canManageBranches: false,
      canManageUsers: false,
      canViewCosts: false,
      canViewProfitLoss: false,
      canViewPurchases: false,
      canViewReports: false,
      canEditOrders,
      canRefundOrders: false,
      canManageMenu: false,
      canManageInventory: false,
      canUsePOS: true,
      canUseKDS: false,
      canUseDelivery: false
    },
    kitchen: {
      label: "Kitchen Staff",
      canSwitchBranches: false,
      canViewAllBranches: false,
      canManageBranches: false,
      canManageUsers: false,
      canViewCosts: false,
      canViewProfitLoss: false,
      canViewPurchases: false,
      canViewReports: false,
      canEditOrders: false,
      canRefundOrders: false,
      canManageMenu: false,
      canManageInventory: false,
      canUsePOS: false,
      canUseKDS: true,
      canUseDelivery: false
    },
    rider: {
      label: "Delivery Rider",
      canSwitchBranches: false,
      canViewAllBranches: false,
      canManageBranches: false,
      canManageUsers: false,
      canViewCosts: false,
      canViewProfitLoss: false,
      canViewPurchases: false,
      canViewReports: false,
      canEditOrders: false,
      canRefundOrders: false,
      canManageMenu: false,
      canManageInventory: false,
      canUsePOS: false,
      canUseKDS: false,
      canUseDelivery: true
    }
  };

  return map[role] || map.cashier;
}

function defaultPermissions(role) {`
  );
}

// Make defaultPermissions return strict permissions
code = code.replace(
  `function defaultPermissions(role) {
  return {
    ...(ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.cashier)
  };
}`,
  `function defaultPermissions(role) {
  return strictPermissionsForRole(role);
}`
);

// Make finalPermissions strict, but preserve canEditOrders override only
code = code.replace(
  `function finalPermissions(user) {
  return {
    ...defaultPermissions(user.role),
    ...(user.permissions || {})
  };
}`,
  `function finalPermissions(user) {
  return strictPermissionsForRole(user.role, {
    canEditOrders: user.permissions?.canEditOrders
  });
}`
);

// In normal role-access create user route, force strict permissions
code = code.replaceAll(
  `permissions: {
          ...defaultPermissions(role),
          ...(permissions || {})
        },`,
  `permissions: strictPermissionsForRole(role, {
          canEditOrders: permissions?.canEditOrders
        }),`
);

// In super create user route, force strict permissions
code = code.replaceAll(
  `permissions: {
          ...defaultPermissions(role),
          ...(permissions || {})
        },`,
  `permissions: strictPermissionsForRole(role, {
          canEditOrders: permissions?.canEditOrders
        }),`
);

// In update routes, force strict permissions too
code = code.replaceAll(
  `user.permissions = {
      ...defaultPermissions(user.role),
      ...(user.permissions || {}),
      ...(permissions || {})
    };`,
  `user.permissions = strictPermissionsForRole(user.role, {
      canEditOrders: permissions?.canEditOrders ?? user.permissions?.canEditOrders
    });`
);

code = code.replaceAll(
  `user.permissions = {
      ...defaultPermissions(user.role),
      ...(user.permissions || {}),
      ...(permissions || {})
    };`,
  `user.permissions = strictPermissionsForRole(user.role, {
      canEditOrders: permissions?.canEditOrders ?? user.permissions?.canEditOrders
    });`
);

// Demo users also use strict role permission
code = code.replaceAll(
  `permissions: defaultPermissions("owner")`,
  `permissions: strictPermissionsForRole("owner")`
);

code = code.replaceAll(
  `permissions: defaultPermissions("branch_manager")`,
  `permissions: strictPermissionsForRole("branch_manager")`
);

code = code.replaceAll(
  `permissions: defaultPermissions("kitchen")`,
  `permissions: strictPermissionsForRole("kitchen")`
);

code = code.replaceAll(
  `permissions: defaultPermissions("rider")`,
  `permissions: strictPermissionsForRole("rider")`
);

code = code.replaceAll(
  `permissions: { ...defaultPermissions("cashier"), canEditOrders: true }`,
  `permissions: strictPermissionsForRole("cashier", { canEditOrders: true })`
);

write(roleRoutes, code);

console.log("Role authorities fixed.");