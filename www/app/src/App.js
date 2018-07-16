import React, { Component } from 'react';
import './App.css';
import Header from './user/main/components/headerComponents/Header.jsx';
// import Home from './user/home/Home.js';
import Footer from "./user/main/components/footerComponents/Footer";
import Main from './Main'


class App extends Component {
  render() {
    return (
      <div>
        <Header />
		<Main />
        <Footer />
      </div>
    );
  }
}

export default App;