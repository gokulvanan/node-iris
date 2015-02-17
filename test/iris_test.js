

var master  = require("./workers/master.js");

module.exports = {
	
	testSimulation: function(test){
		console.log('running test');
		master.kickStart();
		test.done();
	}
}