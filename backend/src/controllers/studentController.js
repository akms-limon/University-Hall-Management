import { StatusCodes } from "http-status-codes";
import { apiResponse } from "../utils/ApiResponse.js";
import { studentService } from "../services/studentService.js";

export const studentController = {
  async createStudent(req, res) {
    const student = await studentService.createStudent(req.body, req.user);
    return res.status(StatusCodes.CREATED).json(
      apiResponse({
        message: "Student created successfully",
        data: { student },
      })
    );
  },

  async listStudents(req, res) {
    const result = await studentService.listStudents(req.query);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Students fetched successfully",
        data: {
          items: result.items,
          summary: result.summary,
        },
        meta: result.meta,
      })
    );
  },

  async getStudentById(req, res) {
    const student = await studentService.getStudentById(req.params.studentId);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Student fetched successfully",
        data: { student },
      })
    );
  },

  async updateStudentById(req, res) {
    const student = await studentService.updateStudentById(req.params.studentId, req.body, req.user);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Student updated successfully",
        data: { student },
      })
    );
  },

  async updateStudentStatus(req, res) {
    const student = await studentService.updateStudentStatus(req.params.studentId, req.body.isActive, req.user);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: req.body.isActive ? "Student activated successfully" : "Student deactivated successfully",
        data: { student },
      })
    );
  },

  async getMyProfile(req, res) {
    const student = await studentService.getMyStudentProfile(req.user);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Student profile fetched successfully",
        data: { student },
      })
    );
  },

  async updateMyProfile(req, res) {
    const student = await studentService.updateMyStudentProfile(req.user, req.body);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Student profile updated successfully",
        data: { student },
      })
    );
  },
};
