
var irisPath = __dirname+"/../../lib/iris.js";
var iris = require(irisPath);

iris.extend((function(){


	return{
		// logger:"logger",
		onLoad:function(){
			console.log("DrNefario.js has loaded");
		},
		onInit:function(data){
			console.log("DrNefario has got init call");
		},
		onDie:function(data){
			console.log("DrNefario has been asked to die");
		},
		onKill:function(data){
			console.log("DrNefario is killed");
		},
		onMessage: function(data){
			data.msg="aye aye Gru";
			return data;
		}
	}

}).call(this));
