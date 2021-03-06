import React, { Component } from 'react';
import { PostData } from '../main/components/PostData';
import history from "../history/history";
import jwtDecode from 'jwt-decode';
import './chat.css';
import 'antd/dist/antd.css'
import { Button } from 'antd';
import { Menu, Dropdown } from 'antd';
import Dialog from './Dialog';
import iziToast from 'izitoast';
import 'izitoast/dist/css/iziToast.min.css';

class ChatComponents extends Component {
	constructor(props) {
		super(props);
		const user = jwtDecode(localStorage.getItem('token'));
		this.state = {
			currentUserId: user.userId,
			txtmsg: '',
			fromWhoUnread: [],
			withWho: ''
		}
		this.conn = new WebSocket('ws://localhost:8090')
		this.onMessage = this.onMessage.bind(this);
		this.conn.onmessage = this.onMessage.bind(this)
		this.updateData = this.updateData.bind(this)
		this.conn.handleSendMsg = this.updateData.bind(this)
		this.showMessageHistory = this.showMessageHistory.bind(this)
		this.addNewChat = this.addNewChat.bind(this)
	}

	componentDidMount(){
		this._mounted = true
		const token = localStorage.getItem('token');
		if (token !== null) {
			const user = jwtDecode(token);

			PostData('user/isFull', {userId: user.userId}).then ((result) => {
				if (result.error !== '' || result.error !== undefined) {
					this.setState({ 
						errMsg: result.error
					});
				} else {
					this.setState({ 
						full: result
					});
				}
			}, PostData('message/historyInit', {userId: this.state.currentUserId}).then ((result) => {
					this.setState({
						userName: user.userName + ' ' + user.userSurname,
						myPic: result.myAva,
						conversations: result.data,
						fromWhoUnread: result.fromWhoUnread,
						myMatches: result.myMatches
					})
				})
			);
			if (this.state.full === false) {
				history.push('/cabinet');
			}
		}
	}

	сomponentWillUnmount () {
		this._mounted = false
	}

	showMessageHistory(e){
		if (e.currentTarget.name) {
			const target = parseInt(e.currentTarget.name, 10);
			let readHistory = this.state.conversations.filter(conversation => conversation.withWho === target)[0]
			for (let i = readHistory.messagies.length - 1; i >= 0; i--) {
				if (readHistory.messagies[i].sender !== this.state.currentUserId) {
					readHistory.messagies[i].read = 1
				}
			}
			for (let k = 0; k < readHistory.messagies.length; k++) {
				if (this.state.conversations[k].withWho === target){
					let newConversations = this.state.conversations;
					// newConversations.splice(k, 1);
					newConversations.forEach(function(item, i) { if (item.withWho === target) newConversations[i] = readHistory; });
					// newConversations.push(readHistory);
					this.setState({
						conversations: newConversations
					})
					break ;
				}
			}
			PostData('message/markAsRead', {uId: this.state.currentUserId, sender: target}).then((res) => {
				let newUnreadArray = this.state.fromWhoUnread;
				for (let k = 0; k < newUnreadArray.length; k++) {
					if (newUnreadArray[k] === target){
						newUnreadArray.splice(k, 1);
						this.setState({
							fromWhoUnread: newUnreadArray
						})
						break ;
					}
				}
			})
			this.setState({
				withWho: target,
				toPrint: readHistory
			})
		}
	}

	onMessage(event){
		if (this._mounted) {
			const data = JSON.parse(event.data);
			const date = new Date();
			const target = parseInt(data.user_id, 10);
			if (data.event === 'message' && data.user_id !== this.state.currentUserId) {
				PostData('message/get', {
						sender: data.user_id, 
						reciever: this.state.currentUserId,
					}).then((res) => {
							if (window.location.href.includes("chat")) {
								let newMsg = this.state.conversations.filter(conversation => conversation.withWho === target)
								const arrayB = {sender: data.user_id, content: data.myVar.trim(), time: date.getHours() + ':' + date.getMinutes()};
								let forPrint;
								if (newMsg === undefined || newMsg.length === 0) {
									newMsg = {
										withWho: data.user_id,
										name: data.payload.substr(0, data.payload.indexOf(' sent')),
										ava: data.ava,
										messagies: [arrayB]
									}
									forPrint = this.state.conversations;
									forPrint.push(newMsg);
								} else {
									newMsg[0].messagies.push(arrayB)
									forPrint = this.state.conversations.map(obj => newMsg.find(o => o.withWho === obj.withWho) || obj)
								}
								let newUnread = this.state.fromWhoUnread;
								if (newUnread.includes(target) === false && parseInt(this.state.withWho, 10) !== target) {
									newUnread.push(target)
								} else if (newUnread.includes(target) && parseInt(this.state.withWho, 10) === target) {

									for (let i = newUnread.length - 1; i >= 0; i--) {
										if (newUnread[i] === target) {
											newUnread.splice(i, 1);
											break ;
										}
									}
								}
								this.setState({ conversations: forPrint, fromWhoUnread: newUnread })
								PostData('message/markAsRead', {uId: this.state.currentUserId, sender: data.user_id}).then((res) => {});
							}
					   })
			}
			if (data.event === 'match' && data.target_id === this.state.currentUserId) {
				//when you got a match it will appear in list for new chat users without reload page
				let newMatches = this.state.myMatches;
				if (newMatches !== undefined && newMatches !== null) {
					const toPushNewMatch = {
						withWho: data.user_id,
						name: data.payload.substr(21),
						ava: data.ava
					};
					newMatches.push(toPushNewMatch);
					this.setState({
						myMatches: newMatches
					})
				}
			}
			if ((data.event === 'disLike' || data.event === 'block') && data.target_id === this.state.currentUserId) {
				let newMatches = this.state.myMatches;
				if (newMatches !== undefined && newMatches !== null) {
					for (let i = newMatches.length - 1; i >= 0; i--) {
						if (newMatches[i].withWho === data.user_id) {
							newMatches.splice(i, 1);
						}
					}
					let newConversations = this.state.conversations;
					for (let i = newConversations.length - 1; i >= 0; i--) {
						if (newConversations[i].withWho === data.user_id) {
							newConversations.splice(i, 1);
						}
					}
					this.setState({
						myMatches: newMatches,
						conversations: newConversations
					})
				}
				if (window.location.href.includes('chat')) {
					iziToast.info({
						message: 'One of previously matched users disliked or blocked you',
						position: 'topRight',
						progressBar: false
					})
				}
			}
		}
	}

	updateData(value) {
		const date = new Date()
		this.setState({txtmsg: value}, 
			this.conn.send(JSON.stringify({
				event: 'message',
				payload: this.state.userName + ' sent you a message',
				ava: this.state.myPic,
				user_id: this.state.currentUserId,
				target_id: this.state.withWho,
				myVar: value
			}), PostData('message/send', {uId: this.state.currentUserId, 
					target: this.state.withWho, 
					time: date.getFullYear() + '-' + (date.getMonth()+1) + '-' + date.getDate() + ' ' + date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds(), 
					msg: value.trim()}).then ((res) => {
						this.setState({
							conversations: res.data
						})
					})
			)
		)
	}

	addNewChat (e) {
		const identifier = e.key
		if (this.state.myMatches.length !== 0) {
			const toChat = this.state.myMatches[identifier].withWho
			this.setState({
				withWho: toChat
			})
		}
	}

	render() {
		const conversations = this.state.conversations;
		let toPrint = {};
		if (conversations !== undefined && this.state.withWho !== ""){
			toPrint = conversations.filter(conversation => conversation.withWho === this.state.withWho)[0]
			const nameMatch = this.state.myMatches.filter(match => match.withWho === this.state.withWho)[0]
			if (nameMatch !== undefined) {
				const tmp = {
						name: nameMatch.name,
						withWho: nameMatch.withWho,
						ava: nameMatch.ava,
						messagies: [{
							sender: '',
							time: '',
							content: '',
						}]
					}
				if (toPrint === undefined || toPrint.length === 0) {
					toPrint = [];
					toPrint.push(tmp);
					toPrint = toPrint[0];
					conversations.push(tmp);
				}
			}   
		}
		const menu = (
			<Menu onClick={this.addNewChat}>
					{this.state.myMatches !== undefined && this.state.myMatches.length !== 0 ?
						this.state.myMatches.map((match, i) => 
							<Menu.Item key={i}>
								<div className="messages__item" myprop={match.withWho}>
									<div className="name-img" myprop={match.withWho}>
										<img className="name-img__src" src={match.ava} myprop={match.withWho} alt="Chat with this person"></img>
									</div>
									<div className="name" myprop={match.withWho}>
										<b>{match.name}</b>
									</div>
								</div>
							</Menu.Item>
						)
						: 
						<Menu.Item key="0">
							<p id="notifTxt-null">This list is empty for now</p>
						</Menu.Item>
					}
			</Menu>
		)
		return (
			<div className="chat-holder">
				<div id="wrapper" className="chatComponent">
					<div className="messages">
						
						<Dropdown overlay={menu} trigger={['click']} onClick={this.showMorePeople} >
							<Button name={this.state.currentUserId} className="morePeople" icon="plus" size="large">More people for chat</Button>
						</Dropdown>
						{conversations !== undefined && conversations.length > 0 ? 
							conversations.map((conversation) => (
								<Button className={ this.state.withWho === conversation.withWho ? "messages__item messages__item-actieve" : "messages__item"} key={conversation.withWho} name={conversation.withWho} onClick={this.showMessageHistory}>
									<div className="name-img" name={conversation.withWho}>
										<img className="name-img__src" src={conversation.ava} name={conversation.withWho} alt="Chat with this person"></img>
										{this.state.fromWhoUnread.includes(parseInt(conversation.withWho, 10)) ? <div className="newMsg"></div> : null}
									</div>
									<div className="name" name={conversation.withWho}>
										<b>{conversation.name}</b>
										{conversation.isOnline ? (
											<span className="chat-person__statuse">
												online
											</span>) : null
										}
									</div>
								</Button>
							)) 
							: null
						}
					</div>
						{conversations !== undefined && conversations.length > 0 && this.state.withWho !== "" && toPrint !== undefined ?    
							(<Dialog updateData={this.updateData} withWho={this.state.withWho} withWhoName={toPrint.name} me={this.state.currentUserId} conversation={toPrint.messagies}/>)
							:
							(<div className="message-content message-content--initial"></div>)
						}
				</div>
			</div>
		);
	}
}
export default ChatComponents;