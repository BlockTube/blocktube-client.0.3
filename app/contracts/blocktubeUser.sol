contract btuser {

	address owner;

	users[address] public Users;

	mapping (address => User) public users;
	
	event userAdded(address who, string hash);

	function btuser(){
	    owner = msg.sender;
	}

	function setProfilehash(string _hash) {
		users[msg.sender] = _hash;
		userAdded(msg.sender, _hash);
	}

	function kill() { if (msg.sender == owner) suicide(owner); }
}