import { Router } from "express";
import { USER_ROLES } from "../constants/roles.js";
import { supportTicketController } from "../controllers/supportTicketController.js";
import { requireAuth } from "../middlewares/authMiddleware.js";
import { authorize } from "../middlewares/rbacMiddleware.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  addAssignedTicketMessageSchema,
  addMyTicketMessageSchema,
  addProvostTicketMessageSchema,
  assignSupportTicketSchema,
  createSupportTicketSchema,
  listAssignedSupportTicketsSchema,
  listMySupportTicketsSchema,
  listSupportTicketsSchema,
  supportTicketIdParamSchema,
  updateAssignedSupportTicketSchema,
  updateSupportTicketStatusSchema,
} from "../validations/supportTicketValidation.js";

const router = Router();

router.use(requireAuth);

// Student routes
router.post(
  "/me",
  authorize(USER_ROLES.STUDENT),
  validateRequest(createSupportTicketSchema),
  asyncHandler(supportTicketController.createMyTicket)
);
router.get(
  "/me",
  authorize(USER_ROLES.STUDENT),
  validateRequest(listMySupportTicketsSchema),
  asyncHandler(supportTicketController.listMyTickets)
);
router.get(
  "/me/:ticketId",
  authorize(USER_ROLES.STUDENT),
  validateRequest(supportTicketIdParamSchema),
  asyncHandler(supportTicketController.getMyTicketById)
);
router.post(
  "/me/:ticketId/messages",
  authorize(USER_ROLES.STUDENT),
  validateRequest(addMyTicketMessageSchema),
  asyncHandler(supportTicketController.addMyMessage)
);

// Staff routes
router.get(
  "/assigned",
  authorize(USER_ROLES.STAFF),
  validateRequest(listAssignedSupportTicketsSchema),
  asyncHandler(supportTicketController.listAssignedTickets)
);
router.get(
  "/assigned/:ticketId",
  authorize(USER_ROLES.STAFF),
  validateRequest(supportTicketIdParamSchema),
  asyncHandler(supportTicketController.getAssignedTicketById)
);
router.post(
  "/assigned/:ticketId/messages",
  authorize(USER_ROLES.STAFF),
  validateRequest(addAssignedTicketMessageSchema),
  asyncHandler(supportTicketController.addAssignedMessage)
);
router.patch(
  "/assigned/:ticketId",
  authorize(USER_ROLES.STAFF),
  validateRequest(updateAssignedSupportTicketSchema),
  asyncHandler(supportTicketController.updateAssignedTicket)
);

// Provost routes
router.get(
  "/",
  authorize(USER_ROLES.PROVOST),
  validateRequest(listSupportTicketsSchema),
  asyncHandler(supportTicketController.listTickets)
);
router.get(
  "/:ticketId",
  authorize(USER_ROLES.PROVOST),
  validateRequest(supportTicketIdParamSchema),
  asyncHandler(supportTicketController.getTicketById)
);
router.patch(
  "/:ticketId/assign",
  authorize(USER_ROLES.PROVOST),
  validateRequest(assignSupportTicketSchema),
  asyncHandler(supportTicketController.assignTicket)
);
router.patch(
  "/:ticketId/status",
  authorize(USER_ROLES.PROVOST),
  validateRequest(updateSupportTicketStatusSchema),
  asyncHandler(supportTicketController.updateTicketStatus)
);
router.post(
  "/:ticketId/messages",
  authorize(USER_ROLES.PROVOST),
  validateRequest(addProvostTicketMessageSchema),
  asyncHandler(supportTicketController.addProvostMessage)
);

export default router;

