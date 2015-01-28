

var master  = require("./workers/master.js");

module.exports = {
	
	testSimulation: function(test){
		master.kickStart();
		test.done();
	}
}