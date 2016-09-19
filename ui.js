// require('./angular/angular.min.js');
// require('./angular/angular-animate.min.js');
// require('./angular/angular-aria.min.js');
// require('./angular/angular-material.js');
require('angular');

const ElectronEventService = require('./ui/electron/eventService.js');
const PlexporterView = require('./ui/plexporterView.js');

const uiModule = angular.module('plexporter-ui', [
  // 'ngMaterial',
  require('angular-animate'),
  require('angular-aria'),
  require('angular-material'),
]);

uiModule.component(PlexporterView.COMPONENT_NAME, PlexporterView.COMPONENT);
uiModule.service(ElectronEventService.SERVICE_NAME, ElectronEventService);

module.exports = uiModule;
