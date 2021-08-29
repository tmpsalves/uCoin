import React, { Component } from 'react';
import { Link } from 'react-router-dom'; //faz mudar a página sem fazer refresh
import logo from '../assets/logo.png';

class App extends Component {
  state = { walletInfo: {} };

  componentDidMount() {
    fetch(`${document.location.origin}/api/wallet-info`)
      .then(response => response.json())
      .then(json => this.setState({ walletInfo: json }));
  }

  render() {
    const { address, balance } = this.state.walletInfo;

    return (
      <div className='App'>
        <img className='logo' src={logo}></img>
        <br />
        <div>
          uCoin!
        </div>
        <br />
        <div><Link to='/blocks'>Blocks</Link></div>
        <div><Link to='/conduct-transaction'>Fazer uma Transação</Link></div>
        <div><Link to='/transaction-pool'>Área de Transações</Link></div>
        <br />
        <div className='WalletInfo'>
          <div>Carteira: {address}</div>
          <div>Saldo: {balance}</div>
        </div>
        <br />
        <br />
        <div>
          Trabalho Realizado por: Tiago Alves | 30003460 | Universidade Autónoma de Lisboa
        </div>
      </div>
    );
  }
}

export default App;