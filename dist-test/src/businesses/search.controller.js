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
exports.SearchController = void 0;
const common_1 = require("@nestjs/common");
const businesses_service_1 = require("./businesses.service");
let SearchController = class SearchController {
    constructor(businessesService) {
        this.businessesService = businessesService;
    }
    searchBusinesses(q, city, locality, category, minRatingStr, verifiedOnlyStr, openNowStr, latStr, lngStr, sortBy, pageStr, limitStr) {
        const minRating = minRatingStr ? parseFloat(minRatingStr) : undefined;
        const verifiedOnly = verifiedOnlyStr === "true" || verifiedOnlyStr === "1";
        const openNow = openNowStr === "true" || openNowStr === "1";
        const userLat = latStr ? parseFloat(latStr) : undefined;
        const userLng = lngStr ? parseFloat(lngStr) : undefined;
        const page = pageStr ? parseInt(pageStr, 10) : 1;
        const limit = limitStr ? parseInt(limitStr, 10) : 10;
        const result = this.businessesService.searchBusinesses({
            q,
            citySlug: city,
            localitySlug: locality,
            categorySlug: category,
            minRating,
            verifiedOnly,
            openNow,
            userLat,
            userLng,
            sortBy,
            page,
            limit,
        });
        return {
            success: true,
            data: result.items,
            meta: result.meta,
        };
    }
    getSuggestions(q, city) {
        const data = this.businessesService.getSuggestions(q || "", city);
        return {
            success: true,
            data,
        };
    }
};
exports.SearchController = SearchController;
__decorate([
    (0, common_1.Get)("businesses"),
    __param(0, (0, common_1.Query)("q")),
    __param(1, (0, common_1.Query)("city")),
    __param(2, (0, common_1.Query)("locality")),
    __param(3, (0, common_1.Query)("category")),
    __param(4, (0, common_1.Query)("minRating")),
    __param(5, (0, common_1.Query)("verifiedOnly")),
    __param(6, (0, common_1.Query)("openNow")),
    __param(7, (0, common_1.Query)("lat")),
    __param(8, (0, common_1.Query)("lng")),
    __param(9, (0, common_1.Query)("sortBy")),
    __param(10, (0, common_1.Query)("page")),
    __param(11, (0, common_1.Query)("limit")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], SearchController.prototype, "searchBusinesses", null);
__decorate([
    (0, common_1.Get)("suggest"),
    __param(0, (0, common_1.Query)("q")),
    __param(1, (0, common_1.Query)("city")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], SearchController.prototype, "getSuggestions", null);
exports.SearchController = SearchController = __decorate([
    (0, common_1.Controller)("search"),
    __metadata("design:paramtypes", [businesses_service_1.BusinessesService])
], SearchController);
//# sourceMappingURL=search.controller.js.map