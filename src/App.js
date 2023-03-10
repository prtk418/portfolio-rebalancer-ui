import logo from './logo.svg';
import './App.css';
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

import fundFactoryABI from "./abis/fundFactory.json";
import fundABI from "./abis/fund.json";
import erc20ABI from "./abis/erc20.json"

function App() {
  const UNISWAP_ROUTER_CONTRACT = "0xf164fC0Ec4E93095b804a4795bBe1e041497b92a";
  const BASE_TOKEN_CONTRACT = "0xd35CCeEAD182dcee0F148EbaC9447DA2c4D449c4"; // Goerli USDC
  const FUND_FACTORY_CONTRACT = "0xE78bFfaceA86f84128E9dafCd4875D1A1527a81B";

  const [isConnected, setIsConnected] = useState(false);
  const [accountAddress, setAccountAddress] = useState('');
  const [haveMetamask, sethaveMetamask] = useState(true);

  const [queryTokens, setQueryTokens] = useState('');
  const [funds, setFunds] = useState(['']);
  const [depositAmount, setDepositAmount] = useState('');

  const { ethereum } = window;
  const provider = new ethers.BrowserProvider(window.ethereum);

  useEffect(() => {
    const { ethereum } = window;
    const checkMetamaskAvailability = async () => {
      if (!ethereum) {
        sethaveMetamask(false);
      }
      sethaveMetamask(true);
    };
    checkMetamaskAvailability();
  }, []);

  useEffect(() => {
    const fetchFunds = async () => {
      if (!isConnected) {
        await connectWallet();
      }
      const signer = await provider.getSigner();
      const fundFactoryContract = new ethers.Contract(FUND_FACTORY_CONTRACT, fundFactoryABI, provider);
      const fundCount = await fundFactoryContract.ownerFundsCount(accountAddress);
      
      let funds = []
      for(let i=0; i<fundCount; i++) {
        funds.push(await fundFactoryContract.ownerFunds(accountAddress, i));
      }
      setFunds(funds);
    };
    fetchFunds();
  }, [accountAddress]);

  const connectWallet = async () => {
    try {
      if (!ethereum) {
        sethaveMetamask(false);
      }
      const accounts = await ethereum.request({
        method: 'eth_requestAccounts',
      });
      setAccountAddress(accounts[0]);
      setIsConnected(true);
    } catch (error) {
      setIsConnected(false);
    }
  };

  const createFund = async () => {
    if (!isConnected) {
      await connectWallet();
    }
    let queryTokensArr = queryTokens.trim().split(',')
    queryTokensArr = queryTokensArr.map((e) => e.trim());
    if (queryTokensArr.length < 3 || queryTokensArr.length > 10) {
      alert("Only 3<=assets<=10 allowed");
      return;
    }

    const signer = await provider.getSigner();
    const fundFactoryContract = new ethers.Contract(FUND_FACTORY_CONTRACT, fundFactoryABI, provider);
    try {
      let tx = await fundFactoryContract.connect(signer).createFund(
        queryTokensArr,
        BASE_TOKEN_CONTRACT,
        UNISWAP_ROUTER_CONTRACT
      );
      await tx.wait();

      setQueryTokens('');
    } catch (err) {
      alert(err);
    }
  }

  const depositFund = async (fund) => {
    if (!isConnected) {
      await connectWallet();
    }
    const signer = await provider.getSigner();
    const baseTokenContract = new ethers.Contract(BASE_TOKEN_CONTRACT, erc20ABI, provider);

    const balance = ethers.formatUnits(await baseTokenContract.balanceOf(signer.address), 6);

    if(balance < depositAmount) {
      alert('Insufficient balance');
      return
    }

    try {
      let tx = await baseTokenContract.connect(signer).transfer(
        fund,
        ethers.parseUnits(depositAmount, 6)
      );
      await tx.wait();

      setDepositAmount('')
    } catch(err) {
      alert(err);
    }
  }

  const rebalanceFund = async (fund) => {
    if (!isConnected) {
      await connectWallet();
    }
    const signer = await provider.getSigner();
    const fundContract = new ethers.Contract(fund, fundABI, provider);
    try {
      let tx = await fundContract.connect(signer).rebalance();
      await tx.wait();
    } catch(err) {
      alert(err)
    }
  }

  return (
    <div className="App">
      <header className="App-header">
        {haveMetamask ? (
          <div className="App-header">
            {isConnected && (
              <div className="card">
                <div className="card-row">
                  <p className="wallet-address">
                    {accountAddress.slice(0, 4)}...
                    {accountAddress.slice(38, 42)}
                  </p>
                </div>
              </div>
            )}
            {!isConnected && (
              <button className="wallet-btn" onClick={connectWallet}>
                Connect
              </button>
            )}
          </div>
        ) : (
          <p>Please Install MataMask</p>
        )}
      </header>
      <body>
        <div className="create-fund-section">
          <h3>Create fund</h3>
          <div className="create-fund-form">
            <input className="asset-input" placeholder="Comma separated addresses" onChange={(e) => {setQueryTokens(e.target.value)}} value={queryTokens} />
            <button className="create-fund-btn" onClick={() => createFund()}> Create </button>
          </div>
        </div>
        <div className="list-funds-section">
          <h3>Funds</h3>
          {funds.map((fund, idx) => {
            return <li key={idx}>
              {fund}
              <input className="asset-deposit" placeholder="USDC amount" onChange={(e) => {setDepositAmount(e.target.value)}} value={depositAmount} />
              <button className="deposit-fund-btn" onClick={() => depositFund(fund)}> Deposit USDC </button>
              <button className="rebalance-btn" onClick={() => rebalanceFund(fund)}> Rebalance </button>
            </li>;
          })}
        </div>
      </body>
    </div>
  );
}

export default App;
