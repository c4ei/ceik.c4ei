var network = {
  send: function() {
    var respond = this.onresponse;
    setTimeout(async function() {
      try {
        const betAmount = document.getElementById('betAmount').value;
        if (!betAmount) {
          alert('Please enter a bet amount.');
          return;
        }

        const response = await fetch('/slot/result', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ betAmount: parseInt(betAmount) })
        });
        const data = await response.json();

        if (data.error) {
          alert(data.error);
        } else {
          respond({
            result: data.result
          });
          document.getElementById('balance').innerText = data.balance;
          document.getElementById('score').innerText = data.score;
        }
      } catch (error) {
        console.error('Error fetching result:', error);
      }
    }, Math.random() * 500); // random response delay
  },
  onresponse: null,
};
