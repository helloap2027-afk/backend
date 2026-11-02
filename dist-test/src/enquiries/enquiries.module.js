"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnquiriesModule = void 0;
const common_1 = require("@nestjs/common");
const enquiries_service_1 = require("./enquiries.service");
const enquiries_controller_1 = require("./enquiries.controller");
const database_module_1 = require("../database/database.module");
const auth_module_1 = require("../auth/auth.module");
let EnquiriesModule = class EnquiriesModule {
};
exports.EnquiriesModule = EnquiriesModule;
exports.EnquiriesModule = EnquiriesModule = __decorate([
    (0, common_1.Module)({
        imports: [database_module_1.DatabaseModule, auth_module_1.AuthModule],
        controllers: [enquiries_controller_1.EnquiriesController],
        providers: [enquiries_service_1.EnquiriesService],
        exports: [enquiries_service_1.EnquiriesService],
    })
], EnquiriesModule);
//# sourceMappingURL=enquiries.module.js.map