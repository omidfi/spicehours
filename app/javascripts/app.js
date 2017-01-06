function render() {
  var payrollList = React.createElement(Components.Main, { state: Service.getState() });
  ReactDOM.render(payrollList, document.getElementById('root'));
}

window.addEventListener('render', function(e) {
  render();
});

window.onload = function() {
  web3.version.getNetwork(function(err, result) {
    if (err) {
      alert("Error finding network: " + err.toString());
      return;
    }
    
    var network_id = result.toString();
    var network_found = true;
    Object.keys(__contracts__).forEach(function(contract_name) {
      var contract = window[contract_name];
      if (contract.all_networks[network_id]) {
        contract.setNetwork(network_id);
      } else {
        network_found = false;
      }
    });

    if (!network_found) {
      alert("Network ID " + network_id + " is not found in all contracts");
      return;
    }
    web3.eth.getAccounts(function(err, accs) {
      if (err != null) {
        alert("There was an error fetching your accounts.");
        return;
      }

      Service.fetchPayrolls().then(function() { render(); });
    });
  });
}
