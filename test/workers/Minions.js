
var irisPath = __dirname+"/../../lib/iris.js";
var iris = require(irisPath);

iris.extend((function(){


	return{
		// logger:"logger",
		onLoad:function(){
			console.log("Minions.js has loaded");
		},
		onInit:function(data){
			console.log("Minions has got init call");
		},
		onDie:function(data){
			console.log("Minions has been asked to die");
		},
		onKill:function(data){
			console.log("Minions is killed");
		},
		onMessage: function(data){
			if(data.msg === 'we shall capture the moon;')
				data.msg="banana";
			return data;
		}
	}

}).call(this));
