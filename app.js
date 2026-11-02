/**
 * Phusion Passenger Startup Entrypoint for cPanel / WHM
 * Application: HELLO REST API (api.hello-hi.in)
 */

if (typeof (PhusionPassenger) !== 'undefined') {
  PhusionPassenger.configure({ autoInstall: false });
}

// Require the compiled NestJS production bundle
require('./dist/main.js');

