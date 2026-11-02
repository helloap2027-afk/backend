"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocationsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const locations_service_1 = require("./locations.service");
const auth_guard_1 = require("../auth/guards/auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
class CreateStateDto {
}
class CreateCityDto {
}
class CreateLocalityDto {
}
let LocationsController = class LocationsController {
    constructor(locationsService) {
        this.locationsService = locationsService;
    }
    getStates() {
        return {
            success: true,
            data: this.locationsService.getStates()
        };
    }
    getDistricts(stateId) {
        return {
            success: true,
            data: this.locationsService.getDistricts(stateId)
        };
    }
    getCities(districtId) {
        return {
            success: true,
            data: this.locationsService.getCities(districtId)
        };
    }
    getLocalities(cityId) {
        return {
            success: true,
            data: this.locationsService.getLocalities(cityId)
        };
    }
    lookupPincode(pincode) {
        return {
            success: true,
            data: this.locationsService.lookupPincode(pincode)
        };
    }
    reverseGeocode(lat, lng) {
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lng);
        return {
            success: true,
            data: this.locationsService.reverseGeocode(latitude, longitude)
        };
    }
    findNearby(lat, lng, radiusKm) {
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lng);
        const radius = radiusKm ? parseFloat(radiusKm) : 10;
        return {
            success: true,
            data: this.locationsService.findNearbyBusinesses(latitude, longitude, radius)
        };
    }
    addState(body) {
        return {
            success: true,
            data: this.locationsService.addState(body.name, body.code)
        };
    }
    addCity(body) {
        return {
            success: true,
            data: this.locationsService.addCity(body.districtId, body.name, body.latitude, body.longitude)
        };
    }
    addLocality(body) {
        return {
            success: true,
            data: this.locationsService.addLocality(body.cityId, body.name, body.pincode, body.latitude, body.longitude)
        };
    }
};
exports.LocationsController = LocationsController;
__decorate([
    (0, common_1.Get)("states"),
    (0, swagger_1.ApiOperation)({ summary: "List all active Indian states" }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LocationsController.prototype, "getStates", null);
__decorate([
    (0, common_1.Get)("states/:stateId/districts"),
    (0, swagger_1.ApiOperation)({ summary: "List districts for given state" }),
    __param(0, (0, common_1.Param)("stateId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], LocationsController.prototype, "getDistricts", null);
__decorate([
    (0, common_1.Get)("cities"),
    (0, swagger_1.ApiOperation)({ summary: "List all active cities with coordinates" }),
    __param(0, (0, common_1.Query)("districtId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], LocationsController.prototype, "getCities", null);
__decorate([
    (0, common_1.Get)("cities/:cityId/localities"),
    (0, swagger_1.ApiOperation)({ summary: "List all active localities within a city" }),
    __param(0, (0, common_1.Param)("cityId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], LocationsController.prototype, "getLocalities", null);
__decorate([
    (0, common_1.Get)("pincode/:pincode"),
    (0, swagger_1.ApiOperation)({ summary: "Lookup city and localities by 6-digit Indian PIN code" }),
    __param(0, (0, common_1.Param)("pincode")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], LocationsController.prototype, "lookupPincode", null);
__decorate([
    (0, common_1.Get)("reverse-geocode"),
    (0, swagger_1.ApiOperation)({ summary: "GPS reverse-geocoding: resolve closest city and locality" }),
    __param(0, (0, common_1.Query)("lat")),
    __param(1, (0, common_1.Query)("lng")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], LocationsController.prototype, "reverseGeocode", null);
__decorate([
    (0, common_1.Get)("nearby-businesses"),
    (0, swagger_1.ApiOperation)({ summary: "Find nearby businesses within radius km of coordinates" }),
    __param(0, (0, common_1.Query)("lat")),
    __param(1, (0, common_1.Query)("lng")),
    __param(2, (0, common_1.Query)("radiusKm")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], LocationsController.prototype, "findNearby", null);
__decorate([
    (0, common_1.Post)("admin/states"),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)("SUPER_ADMIN"),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: "Dynamically add a new state (Admin only)" }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateStateDto]),
    __metadata("design:returntype", void 0)
], LocationsController.prototype, "addState", null);
__decorate([
    (0, common_1.Post)("admin/cities"),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)("SUPER_ADMIN"),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: "Dynamically add a new city (Admin only)" }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateCityDto]),
    __metadata("design:returntype", void 0)
], LocationsController.prototype, "addCity", null);
__decorate([
    (0, common_1.Post)("admin/localities"),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)("SUPER_ADMIN"),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: "Dynamically add a new locality (Admin only)" }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateLocalityDto]),
    __metadata("design:returntype", void 0)
], LocationsController.prototype, "addLocality", null);
exports.LocationsController = LocationsController = __decorate([
    (0, swagger_1.ApiTags)("Locations"),
    (0, common_1.Controller)("locations"),
    __metadata("design:paramtypes", [locations_service_1.LocationsService])
], LocationsController);
//# sourceMappingURL=locations.controller.js.map