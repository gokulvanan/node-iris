
var irisPath = __dirname+"/../../lib/iris.js";
var iris = require(irisPath);

var Gru = iris.child({ // start child process
	name : "Gru",
	path : __dirname+'/Gru.js',
	onMessage : function(data){
		// console.log(data);
		if(data.id === 1){
			console.log("Gru says: "+data.msg);
		}
	},
	onError : function(err){
		console.log("Gru says: ' Kevin, we have an error, damage control mode'");
		console.log(err);
	},
	onExit : function (code,signal){
		console.log("Gru says: 'Adios amigo'");
		// console.log(code);
		// console.log(signal);
	}
});


var Minions = iris.child({ // child process
		name : "Minions",
		path : __dirname+'/Minions.js',
		onMessage : function(data){
			console.log("Minons says: "+data.msg);
		},
		onError : function(err){
			console.log("Minions says: 'beep bop beep bop'");
		},
		onExit : function (code,signal){
			console.log("Minions says: 'bachoos'");
		}
	});


exports.kickStart = function(){
	Gru.start(); // sync start
	Minions.start();
	Gru.tell({ id:1, msg:"mission is a go"});// async send
	Minions.tell({ msg: "we shall capture the moon;"});
	setTimeout(function(){
		Gru.stop();
		Minions.stop();
	},5000);
}






