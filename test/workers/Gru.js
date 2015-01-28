
var irisPath = __dirname+"/../../lib/iris.js";
var iris = require(irisPath);

iris.extend((function(){

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

	var DrNefario = iris.child({ //  child process
		name : "DrNefario",
		path : __dirname+'/DrNefario.js',
		onMessage : function(data){
			console.log("DrNefario says: "+data.msg);
		},
		onError : function(err){
			console.log("DrNefario says: 'Oh oh'");
		},
		onExit : function (code,signal){
			console.log("DrNefario says: 'Farwell'");
		}
	});

	return{
		// logger:"logger",
		onLoad:function(){
			console.log("Gru.js has loaded");
		},
		onInit:function(data){
			console.log("Gru has got init call");
			// Minions.start(data);
			// DrNefario.start(data);
		},
		onDie:function(data){
			console.log("Gru has been asked to die");
			// Minions.stop();
			// DrNefario.stop();
		},
		onKill:function(data){
			console.log("Gru is killed");
		},
		onMessage: function(data){
			if (data.id === 1 && data.msg === "mission is a go"){
				data.msg = "roger";
				// Minions.tell({ msg: "we shall capture the moon;"});
				// DrNefario.tell({msg: "build me a shrink gun"});
				return data;
			}
		}
	}

}).call(this));
