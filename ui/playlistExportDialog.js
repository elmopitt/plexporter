const ExportSettings = require('../specification/exportSettings.js');

class PlaylistExportDialog {
  constructor($scope, $mdDialog) {
    this.mdDialog_ = $mdDialog;

    /**
     * @type {?ExportSettings}
     */
    this.initialSettings;

    /**
     * @type {!ExportSettings}
     */
    this.settings = this.initialSettings ?
        angular.copy(this.initialSettings) : new ExportSettings();
  }

  commit() {
    this.mdDialog_.hide(this.settings);
  }

  cancel() {
    this.mdDialog_.cancel();
  }

  static generateOptions(settings) {
    return {
      templateUrl: 'ui/playlistExportDialog.html',
      controller: PlaylistExportDialog,
      controllerAs: '$ctrl',
      bindToController: true,
      locals: {
        initialSettings: settings,
      },
    };
  }
}

module.exports = PlaylistExportDialog;
