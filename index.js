import { ethers } from "./ethers-5.6.esm.min.js"
import { abi, contractAddress } from "./constants.js"

const connectButton = document.getElementById("connectButton")
const withdrawButton = document.getElementById("withdrawButton")
const fundButton = document.getElementById("fundButton")
const balanceButton = document.getElementById("balanceButton")
const statusMessage = document.getElementById("statusMessage");
connectButton.onclick = connect
withdrawButton.onclick = withdraw
fundButton.onclick = fund
balanceButton.onclick = getBalance

async function connect() {
  if (typeof window.ethereum !== "undefined") {
    try {
      await ethereum.request({ method: "eth_requestAccounts" })
    } catch (error) {
      console.log(error)
    }
    connectButton.innerHTML = "Connected"
    const accounts = await ethereum.request({ method: "eth_accounts" })
    console.log(accounts)
  } else {
    connectButton.innerHTML = "Please install MetaMask"
  }
}

async function withdraw() {
  statusMessage.innerText = "Initiating withdrawal...";

  if (typeof window.ethereum !== "undefined") {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send('eth_requestAccounts', []);
    const signer = provider.getSigner();
    const contract = new ethers.Contract(contractAddress, abi, signer);

    try {
      const transactionResponse = await contract.withdraw();
      statusMessage.innerText = "Withdrawing...";

      await listenForTransactionMine(transactionResponse, provider);

      statusMessage.innerText = "Withdrawal completed!";
    } catch (error) {
      console.error(error); // Log the error for debugging
      statusMessage.innerText = "Error encountered during withdrawal."; // You might add more user-friendly messages
    }
  } else {
    statusMessage.innerText = "Please install MetaMask";
  }
}



async function fund() {
  const ethAmount = document.getElementById("ethAmount").value;
  statusMessage.innerText = "Initiating funding...";

  if (!ethAmount || parseFloat(ethAmount) <= 0) {
    statusMessage.innerText = "Please enter a valid ETH amount.";
    return; // Exit early
  }

  if (typeof window.ethereum !== "undefined") {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const contract = new ethers.Contract(contractAddress, abi, signer);

    try {
      const transactionResponse = await contract.fund({
        value: ethers.utils.parseEther(ethAmount),
      });
      statusMessage.innerText = `Funding with ${ethAmount} ETH...`;

      await listenForTransactionMine(transactionResponse, provider);

      statusMessage.innerText = "Funding completed!";
    } catch (error) {
      console.error(error); // Log the error for debugging

      // Check if the error message contains the specific error string from MetaMask
      if (error.message && error.message.includes("You need to spend more ETH")) {
        statusMessage.innerText = "Error: Minimum Donation $50 of Eth";
      } else {
        statusMessage.innerText = "Error encountered during funding.";
      }
    }
  } else {
    statusMessage.innerText = "Please install MetaMask";
  }
}




async function getBalance() {
  if (typeof window.ethereum !== "undefined") {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    try {
      const balance = await provider.getBalance(contractAddress);
      const ethBalance = ethers.utils.formatEther(balance);
      statusMessage.innerHTML = `${ethBalance} ETH`;

      const rate = await fetchETHtoUSD();
      const usdBalanceMessage = document.getElementById("usdBalanceMessage");
      if (rate) {
        const usdBalance = (parseFloat(ethBalance) * rate).toFixed(2);
        usdBalanceMessage.innerText = `Approximate value: $${usdBalance} USD`;
      } else {
        usdBalanceMessage.innerText = "Error fetching USD rate";
      }
    } catch (error) {
      console.log(error);
    }
  } else {
    balanceButton.innerHTML = "Please install MetaMask";
  }
}





function listenForTransactionMine(transactionResponse, provider) {
  console.log(`Mining ${transactionResponse.hash}`)
  return new Promise((resolve, reject) => {
    try {
      provider.once(transactionResponse.hash, (transactionReceipt) => {
        console.log(
          `Completed with ${transactionReceipt.confirmations} confirmations. `
        )
        resolve()
      })
    } catch (error) {
      reject(error)
    }
  })
}



document.getElementById("ethAmount").addEventListener("input", updateUSDValue);

async function fetchETHtoUSD() {
  try {
    const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd");
    const data = await response.json();
    return data.ethereum.usd;
  } catch (error) {
    console.error("Error fetching ETH to USD rate:", error);
    return null;
  }
}

async function updateUSDValue() {
  const ethAmount = parseFloat(document.getElementById("ethAmount").value);
  if (isNaN(ethAmount) || ethAmount <= 0) {
    document.getElementById("usdValue").innerText = "Approximate value: $0.00 USD";
    return;
  }

  const rate = await fetchETHtoUSD();
  if (rate) {
    const usdValue = (ethAmount * rate).toFixed(2);
    document.getElementById("usdValue").innerText = `Approximate value: $${usdValue} USD`;
  } else {
    document.getElementById("usdValue").innerText = "USD Value: Error fetching rate";
  }
}

// Initialize the USD value on page load.
updateUSDValue();




// Hidding the USD ballance when Eth balance is not showing
function hideBalanceDisplay() {
  statusMessage.innerText = "";
  document.getElementById("usdBalanceMessage").innerText = "";
}

connectButton.addEventListener('click', function () {
  hideBalanceDisplay();
  connect();
});

withdrawButton.addEventListener('click', function () {
  hideBalanceDisplay();
  withdraw();
});

fundButton.addEventListener('click', function () {
  hideBalanceDisplay();
  fund();
});

