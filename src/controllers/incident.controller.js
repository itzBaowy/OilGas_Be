import { responseSuccess } from "../common/helpers/function.helper.js";
import { incidentService } from "../services/incident.service.js";

export const incidentController = {
    async getAllIncidents(req, res, next) {
        const result = await incidentService.getAllIncidents(req);
        const response = responseSuccess(result, "Incidents retrieved successfully");
        res.status(response.statusCode).json(response);
    },

    async getIncidentById(req, res, next) {
        const result = await incidentService.getIncidentById(req.params.id);
        const response = responseSuccess(result, "Incident retrieved successfully");
        res.status(response.statusCode).json(response);
    },

    async createIncident(req, res, next) {
        const result = await incidentService.createIncident(req.body, req.user);
        const response = responseSuccess(result, "Incident created successfully", 201);
        res.status(response.statusCode).json(response);
    },

    async acknowledgeIncident(req, res, next) {
        const result = await incidentService.acknowledgeIncident(req.params.id, req.user);
        const response = responseSuccess(result, "Incident acknowledged successfully");
        res.status(response.statusCode).json(response);
    },

    async getAvailableEngineers(req, res, next) {
        const result = await incidentService.getAvailableEngineers(req.params.id);
        const response = responseSuccess(result, "Available engineers retrieved successfully");
        res.status(response.statusCode).json(response);
    },

    async assignEngineerToIncident(req, res, next) {
        const result = await incidentService.assignEngineerToIncident(req.params.id, req.body, req.user);
        const response = responseSuccess(result, "Engineer assigned to incident successfully");
        res.status(response.statusCode).json(response);
    },

    async respondToIncident(req, res, next) {
        const result = await incidentService.respondToIncident(req.params.id, req.body, req.user);
        const response = responseSuccess(result, "Incident response recorded successfully");
        res.status(response.statusCode).json(response);
    },

    async getActiveAlerts(req, res, next) {
        const result = await incidentService.getActiveAlerts();
        const response = responseSuccess(result, "Active alerts retrieved successfully");
        res.status(response.statusCode).json(response);
    },

    async reportManualIncident(req, res, next) {
        const result = await incidentService.reportManualIncident(req.body, req.user);
        const response = responseSuccess(result, "Manual incident reported successfully", 201);
        res.status(response.statusCode).json(response);
    },
};
