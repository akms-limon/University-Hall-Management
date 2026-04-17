import { Router } from "express";
import { USER_ROLES } from "../constants/roles.js";
import { mealController } from "../controllers/mealController.js";
import { requireAuth } from "../middlewares/authMiddleware.js";
import { authorize } from "../middlewares/rbacMiddleware.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  cancelMyMealOrderSchema,
  createMealItemSchema,
  createMealOrderSchema,
  listDailyMenuSchema,
  listMealItemsForStaffSchema,
  listMealOrdersForStaffSchema,
  listMyMealOrdersSchema,
  mealItemIdParamSchema,
  mealOrderIdParamSchema,
  provostMealReportsSchema,
  staffDateWiseMealStatsSchema,
  staffTodayMealStatsSchema,
  updateMealItemAvailabilitySchema,
  updateMealItemSchema,
  updateMealOrderStatusSchema,
} from "../validations/mealValidation.js";

const router = Router();

router.use(requireAuth);

router.get(
  "/menu",
  authorize(USER_ROLES.STUDENT),
  validateRequest(listDailyMenuSchema),
  asyncHandler(mealController.listDailyMenu)
);
router.get(
  "/menu/:itemId",
  authorize(USER_ROLES.STUDENT),
  validateRequest(mealItemIdParamSchema),
  asyncHandler(mealController.getMealItemById)
);
router.post(
  "/orders/me",
  authorize(USER_ROLES.STUDENT),
  validateRequest(createMealOrderSchema),
  asyncHandler(mealController.createMealOrder)
);
router.get(
  "/orders/me",
  authorize(USER_ROLES.STUDENT),
  validateRequest(listMyMealOrdersSchema),
  asyncHandler(mealController.listMyMealOrders)
);
router.get(
  "/orders/me/:orderId",
  authorize(USER_ROLES.STUDENT),
  validateRequest(mealOrderIdParamSchema),
  asyncHandler(mealController.getMyMealOrderById)
);
router.patch(
  "/orders/me/:orderId/cancel",
  authorize(USER_ROLES.STUDENT),
  validateRequest(cancelMyMealOrderSchema),
  asyncHandler(mealController.cancelMyMealOrder)
);

router.post(
  "/staff/menu",
  authorize(USER_ROLES.STAFF),
  validateRequest(createMealItemSchema),
  asyncHandler(mealController.createMealItem)
);
router.get(
  "/staff/menu",
  authorize(USER_ROLES.STAFF),
  validateRequest(listMealItemsForStaffSchema),
  asyncHandler(mealController.listMealItemsForStaff)
);
router.get(
  "/staff/menu/:itemId",
  authorize(USER_ROLES.STAFF),
  validateRequest(mealItemIdParamSchema),
  asyncHandler(mealController.getMealItemByIdForStaff)
);
router.patch(
  "/staff/menu/:itemId",
  authorize(USER_ROLES.STAFF),
  validateRequest(updateMealItemSchema),
  asyncHandler(mealController.updateMealItem)
);
router.delete(
  "/staff/menu/:itemId",
  authorize(USER_ROLES.STAFF),
  validateRequest(mealItemIdParamSchema),
  asyncHandler(mealController.deleteMealItem)
);
router.patch(
  "/staff/menu/:itemId/availability",
  authorize(USER_ROLES.STAFF),
  validateRequest(updateMealItemAvailabilitySchema),
  asyncHandler(mealController.updateMealItemAvailability)
);
router.get(
  "/staff/orders",
  authorize(USER_ROLES.STAFF),
  validateRequest(listMealOrdersForStaffSchema),
  asyncHandler(mealController.listMealOrdersForStaff)
);
router.get(
  "/staff/orders/:orderId",
  authorize(USER_ROLES.STAFF),
  validateRequest(mealOrderIdParamSchema),
  asyncHandler(mealController.getMealOrderByIdForStaff)
);
router.patch(
  "/staff/orders/:orderId/status",
  authorize(USER_ROLES.STAFF),
  validateRequest(updateMealOrderStatusSchema),
  asyncHandler(mealController.updateMealOrderStatus)
);
router.get(
  "/staff/stats/today",
  authorize(USER_ROLES.STAFF),
  validateRequest(staffTodayMealStatsSchema),
  asyncHandler(mealController.getTodayMealStats)
);
router.get(
  "/staff/stats/date-wise",
  authorize(USER_ROLES.STAFF),
  validateRequest(staffDateWiseMealStatsSchema),
  asyncHandler(mealController.getDateWiseMealStats)
);

router.get(
  "/provost/reports",
  authorize(USER_ROLES.PROVOST),
  validateRequest(provostMealReportsSchema),
  asyncHandler(mealController.getProvostMealReports)
);

export default router;
