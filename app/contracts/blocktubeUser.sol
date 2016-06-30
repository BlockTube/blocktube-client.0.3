contract blocktubeUser {

	address owner;
	mapping(address => string) public users;

	event userAdded(address who, string hash);

	function blocktubeUser(){
	    owner = msg.sender;
	}

	function setProfilehash(string _hash) {
		users[msg.sender] = _hash;
		userAdded(msg.sender, _hash);
	}

	function kill() { if (msg.sender == owner) suicide(owner); }
}
