#!/usr/bin/env node

/*
 * main class that provides methods useful in creating abstractions
 * to build child - parent communication
 */

module.exports = (function(){

    function buildDefaultLogger(){
        return {
            info: console.log,
            error: console.log,
            debug: function(obj){}
        };
    }

    return {

        extend: function(obj){
            var logger  = obj.logger || buildDefaultLogger();
            var running = false;

            if(obj.onLoad){
               obj.onLoad();
            }

            /**
             * Invoked when message is sent form parent process (parent script)
             */
            process.on('message',processEvent);

            process.on("SIGINT", function(){
                if(running === true){
                    if(obj.onKill) obj.onKill();
                    logger.info("stoped: "+obj.name)
                }
            });


            /**
             * main subroutine used to process all incoming message
             */
            function processEvent(data){

                var resp = {action: data.action, status:"success", msg:null };
                try{
                    // resp.action = data.action;
                    if(data.action === 'init'){
                        if (obj.onInit) obj.onInit(data);
                        running = true;
                    }else if (data.action === 'die'){
                        if(obj.onDie) obj.onDie(data);
                        running=false; // to ensure this is ignored by sigint listener
                        process.exit(0);
                    }else {
                        // console.log(data);
                        resp.data = obj.onMessage(data.data);
                        // console.log(resp);
                    }             
                }catch(err){
                    if(obj.onError) obj.onError(err);
                    // throw err;
                    // resp.action = data.action;
                    resp.status = "failure";
                    resp.data= {request: data.data, error:err };
                }
                process.send(resp); //by default all message are replied to
            }
        },

        /**
         * returns a wrapper with utilty method to start/stop 
         * the child process
         */
        child: function(obj){

            var name = obj.name; // name of the child process
            var firstChar = obj.path.substring(0,1) ;
            var path = obj.path // path to js of the child
            var logger = obj.logger || buildDefaultLogger(); 
            var count = obj.count || 1; // number of child workers
            var host = obj.host; // if child is deployed on remote machine
            var cp = require('child_process');
            var childreen = [];
            var running = 0;
            var roundRobinCounter = 0; // currently only roundrobin counter supported

            function handleReturn(cb,obj){
                if (cb) cb(obj);
                else throw obj;
            }

            function startChild(obj,cb){
                try{
                    var conf = (obj) ? obj.config : null;
                    var args = (obj) ? ((obj.args) ? obj.args : []) : [];

                    if (running === count) {
                        logger.error(name+" is already running");
                        handleReturn(cb, new Error(name+" is already running"));
                        return
                    }

                    for(var i=0; i<count; i++){
                        childreen.push({child: cp.fork(path,args), running:false});
                    }
                    for (var i=0; i<childreen.length; i++){
                        registerListeners(i);
                    }

                    for(var i=0; i<count; i++){
                        var childProcess = childreen[i];   
                        childProcess.child.send( { action: "init", config: conf });
                    }

                    setTimeout(function(){
                        // console.log("here");
                        // console.log(childreen);
                        if(running !== count){
                            logger.error("not running "+name);
                            handleReturn(cb,new Error("error did not get ack from child:  "+name));
                        }
                    },((1000 * count)/2)); // wait to get the ack
                }catch(err){
                    logger.error("error in starting child "+name+" stack:"+err.stack);
                    handleReturn(cb,err);
                }
            }

            function stopChild(conf,cb){
                try{
                    if(running == 0) {
                        logger.info(name+" is not running");
                        handleReturn(cb,new Error(name+" is not running"));
                        return;
                    }
                    for(var i=0; i<childreen.length && childreen[i].running; i++){
                        childreen[i].child.send({ action: "die", config: conf }); // sent for the child to clean up
                    }
                    
                    //TODO(gokul) need more gracefull shutdown
                    setTimeout(function(){
                        if(running != 0){
                            for(var i=0; i<childreen.length && childreen[i].running; i++){ 
                                childreen[i].child.kill('SIGHUP');
                            }
                        }
                    },(1500*count)/2); // wait for it ack and kill it

                }catch(err){
                    logger.error("error in stoping child "+name+" stack:"+err.stack);
                    handleReturn(cb,err);
                }
            }

            function checkIsRunning(){
                return running === count;
            }

            function pushDataToChild(data){
                // console.log(childreen);
                var childObj = { running:false };
                var safety=0;
                do{
                    if(safety++ > count){
                        throw Error("All childreen are down");
                    }
                    childObj = childreen[(roundRobinCounter++ % count)];
                }while(!childObj.running);
                
                childObj.child.send({'action': "message", "data":data});
            }

            function registerListeners(i){

                var cc = childreen[i];
                var childProcess = cc.child;
                childProcess.on('exit',function(code,signal){
                    logger.debug("exiting child "+name);
                    cc.running=false;
                    running-=1;
                    if(obj.onExit){
                        obj.onExit(code,signal);
                    }
                });

                childProcess.on('error',function(err){
                    try{
                        logger.error("error in communicating with  child "+name);
                        logger.error(err);
                        cc.running=false;
                        running -= 1;
                        if(obj.onError){
                            obj.onError(err);
                        }
                    }catch(error){
                        logger.error("error on exit ");
                    }
                    
                    // childProcesss.kill('SIGHUP');
                });

                childProcess.on('message',function(data){
                    try{
                        logger.debug("got message from child "+name);
                        logger.debug(data);
                        if( data.action === "init") {
                            cc.running =(data.status === 'success');
                            // console.log(childreen);
                            running = (cc.running) ? running+1 : running;
                        } else if ( data.action === "die" ){
                            cc.running = (data.status === 'failure');
                            running = (cc.running) ? running : running-1;
                        } else{
                            if(obj.onMessage){
                                if(data.status === 'success'){
                                    obj.onMessage(data.data);
                                }else{
                                    if(obj.onFailure){ //business errors thrown as exception
                                        obj.onFailure(data.data);
                                    }else{
                                        logger.error(data);
                                    }
                                }
                            }else {
                                logger.info("unhandled message "+data);
                            }
                        }
                    }catch(error){
                        logger.error("error in processing message");
                        cc.child.kill('SIGHUP');
                        cc.running=false;
                        running -=1
                    }     
                });
               
                
            }
            return {
                start: startChild,
                stop: stopChild,
                isRunning: checkIsRunning,
                tell: pushDataToChild

            };
        }
    }
}).call(this);
