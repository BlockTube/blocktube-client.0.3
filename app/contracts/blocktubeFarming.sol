contract blocktubeFarming {

address owner;

struct PriceReward {
    // how many BTcoins to commit to farming this clip
    uint price;
    uint reward;
}


mapping (uint => PriceReward) public pricerewards;

function blocktubeFarming(){
    
    owner = msg.sender;
    
    pricerewards[144] = PriceReward(1,2);
    pricerewards[240] = PriceReward(2,4);
    pricerewards[360] = PriceReward(3,6);
    pricerewards[480] = PriceReward(4,8);
    pricerewards[720] = PriceReward(5,10);
}

struct FarmingEntry {
    // the clip address
	address farmer;
	// timestamp when this entry was claimed
	uint timeclaimed;
	// timestamp when the result was submitted
	uint timesubmitted;
	// owner of the clip should accept the clip
	uint acceptstatus;
	// timestamp when the result was accepted
	uint timeaccepted;
	string ipfshash;
}

FarmingEntry[] bla;
mapping(address => mapping(uint => FarmingEntry)) farmingqueue;

event newclipAdded(address clipaddress); 

function submitNewClip(address clipaddress){
    newclipAdded(clipaddress);
}

// claim a work entry
function getWork(address clipaddress, uint quality){

    // check if the requested quality exists
    if (pricerewards[quality].price == 0x0) throw;
    
    // check if this clip/quality has already been claimed    
    if (farmingqueue[clipaddress][quality].farmer != address(0x0)) throw;    

    farmingqueue[clipaddress][quality] = FarmingEntry(
      msg.sender,
      now,0,0,0,''
    );
}

event workSubmitted(address clipaddress,uint quality,string ipfshash);

function submitWork(address clipaddress,uint quality,string ipfshash){
    // you can only submit your own claimed clips
    if (farmingqueue[clipaddress][quality].farmer != msg.sender) throw; 
    // you can only submit once
    if (farmingqueue[clipaddress][quality].timesubmitted != 0x0) throw; 

    // submit work
    farmingqueue[clipaddress][quality].timesubmitted = now;
    farmingqueue[clipaddress][quality].ipfshash = ipfshash;
    
    // TODO : approve and call BTcoins for this clip aka POS
    // so that the farmer can only claim as much clips as he can commit BTcoins

    workSubmitted(clipaddress,quality,ipfshash);
    
}

// the clipcontract should call this function to approve the work
function acceptWork(uint quality){
    // no clip at this address or not submitted yet
    if (farmingqueue[msg.sender][quality].timesubmitted == 0x0) throw;

    // quality does exist ?
    if (pricerewards[quality].reward == 0x0) throw;

    // TODO : 
    // - mint new tokens
    uint reward = pricerewards[quality].reward;

    // TODO
    // return the approve and called POS
    
}

function kill() { if (msg.sender == owner) suicide(owner); }

	
}