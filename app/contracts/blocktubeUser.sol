contract blocktubeUser {

	address owner;
	mapping(address => string) public users;

	event userAdded(address who, string hash);

	function blocktubeUser(){
	    owner = msg.sender;
	}

	function setProfileHash(string _hash) {
		users[msg.sender] = _hash;
		userAdded(msg.sender, _hash);
	}

	function getProfileHash(address useraddress) returns (string userhash) {
		return users[useraddress];
	}

	function kill() { if (msg.sender == owner) suicide(owner); }
}
