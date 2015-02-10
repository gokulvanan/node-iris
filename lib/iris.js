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

                var resp = {resp.action: data.action, status:"success", msg:null };
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
            var count = obj.count; // number of child workers
            var host = obj.host; // if child is deployed on remote machine
            var cp = require('child_process');
            var childProcess = null;
            var running = false;

            function handleReturn(cb,obj){
                if (cb) cb(obj);
                else throw obj;
            }

            function startChild(obj,cb){
                try{
                    var conf = (obj) ? obj.config : null;
                    var args = (obj) ? ((obj.args) ? obj.args : []) : [];

                    if (running) {
                        logger.error(name+" is already running");
                        handleReturn(cb, new Error(name+" is already running"));
                        return
                    }

                  
                    childProcess = cp.fork(path,args);

                    registerListeners(cb);

                    childProcess.send( { action: "init", config: conf });

                    setTimeout(function(){
                        if(!running){
                            logger.error("not running "+name);
                            handleReturn(cb,new Error("error did not get ack from child:  "+name));
                        }
                    },1000); // wait for 1 a sec to get the ack
                }catch(err){
                    logger.error("error in starting child "+name+" stack:"+err.stack);
                    handleReturn(cb,err);
                }
            }

            function stopChild(conf,cb){
                try{
                    if(!running) {
                        logger.info(name+" is not running");
                        handleReturn(cb,new Error(name+" is not running"));
                        return;
                    }
                    childProcess.send({ action: "die", config: conf }); // sent for the child to clean up
                    //TODO(gokul) need more gracefull shutdown
                    setTimeout(function(){
                        if(running){
                            childProcess.kill('SIGHUP');
                        }
                    },2000); // wait for 2 seconds for it ack and kill it

                }catch(err){
                    logger.error("error in stoping child "+name+" stack:"+err.stack);
                    handleReturn(cb,err);
                }
            }

            function checkIsRunning(){
                return running;
            }

            function pushDataToChild(data){
                childProcess.send({'action': "message", "data":data});
            }

            function registerListeners(cb){

                childProcess.on('exit',function(code,signal){
                    logger.debug("exiting child "+name);
                    running = false;
                    if(obj.onExit){
                        obj.onExit(code,signal);
                    }
                });

                childProcess.on('error',function(err){
                    //TODO add code to check if we can recover from the error
                    logger.error("error in communicating with  child "+name);
                    logger.error(err);
                    running = false;
                    if(obj.onError){
                        obj.onError(err);
                    }
                    // childProcesss.kill('SIGHUP');
                });

                childProcess.on('message',function(data){
                    logger.debug("got message from child "+name);
                    logger.debug(data);
                    if( data.action === "init") {
                        running = (data.status === 'success');
                        if (cb)  cb(null,running);
                    } else if ( data.action === "die" ){
                        running = (data.status === 'failure');
                        if (cb) cb(null,running);
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
