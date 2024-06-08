const network = {
  send: async function() {
      const betAmount = parseInt(document.getElementById('betAmount').value);
      try {
          const response = await fetch('/slot/result', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
              },
              body: JSON.stringify({ betAmount }),
          });
          const data = await response.json();
          if (data.error) {
              alert(data.error);
          } else {
              document.getElementById('balance').innerText = data.balance;
              document.getElementById('score').innerText = data.score;
              this.onresponse(data);
          }
      } catch (error) {
          console.error('Error:', error);
      }
  },
  onresponse: function(response) {
      console.log('Response:', response);
  },
};
