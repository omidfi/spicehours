(function() {
  var profile = {};
  var latestBlock = null;
  var hoursEvents = [];
  var hoursPending = {};
  var ratesPending = {};
  var currentError = null;

  function showError(err) {
    currentError = err;
    setTimeout(function() {
      if (currentError === err) {
        currentError = null;
        updateViews();
      }
    }, 2000);
    updateViews();
  }

  function eventComparator(a, b) {
    if (b.blockNumber != a.blockNumber) {
      return (b.blockNumber - a.blockNumber);
    }
    return (b.logIndex - a.logIndex);
  }

  function eventId(e) {
    return e.blockHash + ':' + e.logIndex;
  }

  var refreshProfile = _.throttle(function() {
    getJSON('/api/profile', function(err, data) {
      if (err) return showError('Error loading profile information');
      profile = data;
      updateViews();
    });
  }, 1000);

  function addHoursEvent(event) {
    for (var i = 0; i < hoursEvents.length; i++) {
      // If event already exists, do not re-add it
      // FIXME: There is no way to construct unique ID for event with light mode, need to think of something else
      //if (eventId(hoursEvents[i]) === eventId(event)) {
      //  return;
      //}
    }
    // FIXME: We used to push and sort, but we have no timestamps so unshift instead...
    //hoursEvents.push(event);
    //hoursEvents.sort(eventComparator);
    hoursEvents.unshift(event);
    refreshProfile();
  }

  function fetchInitial() {
    refreshProfile();
    getJSON('/api/block/latest', function(err, data) {
      latestBlock = data;
      updateViews();
    });
    getJSON('/api/hours/events', function(err, data) {
      data.forEach(function(event) {
        addHoursEvent(event);
      });
      updateViews();
    });
    getJSON('/api/hours/pending', function(err, data) {
      data.forEach(function(tx) {
        hoursPending[tx.hash] = tx;
      });
      updateViews();
    });
  }

  function updateViews() {
    var topContent = React.createElement(TopContent, {
      profile: profile,
      transactions: hoursPending,
      error: currentError,
      sendCallback: function(obj) { postJSON('/api/hours/', obj); },
      errorCallback: function(err) { showError(err); }
    });
    ReactDOM.render(topContent, document.getElementById('top-content'));
    var eventList = React.createElement(EventList, { events: hoursEvents, latestBlock: latestBlock });
    ReactDOM.render(eventList, document.getElementById('event-list'));
  }

  var spinIcon = _.throttle(function() {
    var icon = document.getElementById('chilicorn-icon');
    icon.className = 'spin';
    setTimeout(function() {
      icon.className = '';
    }, 600);
    
  }, 1000, {trailing: false});

  fetchInitial();

  var socket = io();
  socket.on('block', function(msg) {
    console.log('block: ' + msg);
    latestBlock = JSON.parse(msg);
    updateViews();
  });
  socket.on('rates/pending', function(msg) {
    console.log('rates pending: ' + msg);
    const tx = JSON.parse(msg);
    ratesPending[tx.hash] = tx;
  });
  socket.on('rates/tx', function(msg) {
    console.log('rates tx: ' + msg);
    const tx = JSON.parse(msg);
    delete ratesPending[tx.hash];
  });
  socket.on('hours/pending', function(msg) {
    console.log('hours pending: ' + msg);
    const tx = JSON.parse(msg);
    hoursPending[tx.hash] = tx;
    updateViews();
  });
  socket.on('hours/tx', function(msg) {
    console.log('hours tx: ' + msg);
    const tx = JSON.parse(msg);
    delete hoursPending[tx.hash];
    updateViews();
  });
  socket.on('hours/receipt', function(msg) {
    console.log('hours receipt: ' + msg);
  });
  socket.on('hours/event', function(msg) {
    console.log('hours event: ' + msg);
    const event = JSON.parse(msg);
    addHoursEvent(event);
    updateViews();
    spinIcon();
  });
})();
