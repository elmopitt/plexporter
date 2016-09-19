class PlaylistExportDialog {
  constructor($scope, $mdDialog) {
    this.mdDialog_ = $mdDialog;

    this.copyFiles = false;
    this.createM3u = false;
  }

  close() {
    this.mdDialog_.hide();
  }

  static generateOptions() {
    return {
      templateUrl: 'ui/playlistExportDialog.html',
      controller: PlaylistExportDialog,
      controllerAs: '$ctrl',
      bindToController: true,
    };
  }
}

module.exports = PlaylistExportDialog;
