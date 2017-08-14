var fs = require('fs');
var amqp = require('amqplib/callback_api');
var request = require("request");
var youtubedl = require('youtube-dl');
var duration = 0;
var urlyt;

var splitPart;

var splitTime;

var isVideo;
var title;
var duration;
var idVideo;

amqp.connect('amqp://localhost', function(err, conn) {

  conn.createChannel(function(err, ch) {
    var q = 'video';
    ch.assertQueue(q, {durable: false});
    ch.prefetch(2);
    console.log(" [*] Waiting for messages in %s. To exit press CTRL+C", q);
    ch.consume(q, function(msg) {
      console.log(" [x] Received %s", msg.content.toString());
      var res = JSON.parse(msg.content);
      try {
        
          urlyt=res.url;
        
          splitPart=res.splitpart;
      
          splitTime=res.timepart*60;
       
          isVideo=res.isvideo;
       
          idVideo=res.id;

      }
      catch(err) {
          insert("Wrong");
          console.log(err);
          ch.ack(msg);
          return;
      } 
      try {
      init(ch,msg);
      }
      catch(err) {
        insert("Wrong");
        console.log(err);
        ch.ack(msg);
          return;
      } 
      
    }, {noAck: false});
  });
});


function insert(status) {
    var options = { 
    method: 'PUT',
    url: 'http://localhost:3000/videos/'+idVideo,
    headers: 
     { 'postman-token': '44b3d48e-bc4e-69c8-e2d5-0ba937211b33',
       'cache-control': 'no-cache',
       'content-type': 'application/json' },
    body: { state: status },
    json: true };

    request(options, function (error, response, body) {
      if (error){
        console.log("Error conecting with api.");
      }
      console.log("Update status");
    });
  };

function init(ch,msg){
  youtubedl.getInfo(urlyt, ['--username=cquirosny@gmail.com', '--password=Corvette 6C-R'], function(err, info) {
  if (err){
    insert("Wrong")
    console.log("Something goes wrong");
    ch.ack(msg);
    return;
  } 
  try {
    title = info.title.replace(/\//g, " ");
    title = idVideo+" "+title
    duration = info.duration;
    downloadVideo(ch,msg);
  }
  catch(err) {
      insert("Wrong");
      console.log("Something goes wrong");
      ch.ack(msg);
      return;
  } 
});
}


function downloadAudio(ch,msg) {

    var localPath = __dirname+"/"+title;
    
    var exec = require('child_process').exec;
   
    var command = 'ffmpeg -y -i \"'+localPath+'.mp4\" -q:a 0 -map a \"'+localPath+'.mp3\"';
    console.log('Extracting audio');
    insert("Extracting audio")
    exec(command, function(error, stdout, stderr) {
              if(error) {
                insert("Wrong");
                console.log(error);
                ch.ack(msg);
              }
              else {
                downloadSplit(localPath+".mp3",localPath+"%03d.mp3","mp3",ch,msg);
              }
    });
}

function downloadVideo(ch,msg) {
  insert("Downloading");
  console.log("Downloading");
  var localPath = __dirname+"/"+title;
  var video = youtubedl(urlyt,['--format=18'],{ cwd: __dirname });
  video.pipe(fs.createWriteStream(localPath+'.mp4'));
  video.on('end', function() {
    insert("Prosesing");
    console.log("Prosesing");
    console.log(isVideo);
    if(isVideo)
    {
      
      downloadSplit(localPath+".mp4",localPath+"%03d.mp4","mp4",ch,msg);
      }
    else
    {
      downloadAudio(ch,msg);
     
    }
  });
}
function order(array){
  if(array.length==3)
  {
    var aux =array[0];
    array[0] = array[2];
    array[2] = aux;
  }
  else if(array.length==2)
  {
    var aux =array[0];
    array[0] = array[1];
    array[1] = aux;
  }
  return array;
}

function downloadSplit(localPath,localPathdiv,extencion,ch,msg) {
  var time = duration.split(":");
  var dur = 0;
  time= order(time);
  if(time.length>=1)
  {
    dur += parseInt(time[0]);
  }
  if(time.length>=2)
  {
    dur += parseInt(time[1])*60;
  }
  if(time.length>=3)
  {
    dur += parseInt(time[2])*3600;
  }
  var command ;
  if(splitTime>0)
  {
    command = "ffmpeg -y -i \""+localPath+"\" -c copy -map 0 -segment_time "+(splitTime)+" -f segment \""+localPathdiv+"\"";
    console.log('Spliting');
    insert("Spliting")
  }
  else
  {
    var splitpart=parseInt(splitPart)
    if(splitPart>0)
    {
    command = "ffmpeg -y -i \""+localPath+"\" -c copy -map 0 -segment_time "+(dur/splitPart)+" -f segment \""+localPathdiv+"\"";
    console.log('Spliting');
    insert("Spliting")
    }
    else{
        var name =__dirname+"/"+title;

                name =name.replace(/\s/g, "\\ ");
                name =name.replace(/\(/g,"\\(");
                name =name.replace(/\)/g, "\\)");
                name =name.replace(/\-/g, "\\-");
                name =name.replace(/\'/g, "\\'");
                name =name.replace(/\!/g, "\\!");
                name =name.replace(/\|/g, "\\|");
                name =name.replace(/\?/g, "\\?");
                name =name.replace(/\¿/g, "\\¿");
                name =name.replace(/\;/g, "\\;");
                name =name.replace(/\&/g, "\\&");
                name =name.replace(/\"/g, "\\\"");
       execCommand("mv "+name+"."+extencion+"  /home/carlos/Downloads/",ch,msg)
      return;
    }
  }

  var exec = require('child_process').exec;
  exec(command, function(error, stdout, stderr) {
              
              if(error) {
                insert("Wrong");
                console.log(error);
                ch.ack(msg);
              }
              else {
                console.log("succes");
                var name =__dirname+"/"+title;

                name =name.replace(/\s/g, "\\ ");
                name =name.replace(/\(/g,"\\(");
                name =name.replace(/\)/g, "\\)");
                name =name.replace(/\-/g, "\\-");
                name =name.replace(/\'/g, "\\'");
                name =name.replace(/\!/g, "\\!");
                name =name.replace(/\|/g, "\\|");
                name =name.replace(/\?/g, "\\?");
                name =name.replace(/\¿/g, "\\¿");
                name =name.replace(/\;/g, "\\;");
                name =name.replace(/\&/g, "\\&");
                name =name.replace(/\"/g, "\\\"");
                execCommand("mv "+name+"?*"+extencion+"  /home/carlos/Downloads/",ch,msg)
              }
              });

}

function execCommand(command,ch,msg)
{
  var exec = require('child_process').exec;
  exec(command, function(error, stdout, stderr) {
              
              if(error) {
                insert("Wrong");
                console.log(error);
                ch.ack(msg);
              }
              else {
                console.log("Finished");
                insert("Finished");
                ch.ack(msg);
              }
              });
}

/*var extencion = fs.createReadStream('myvideos.mp3');
extencion.pipe(fs.createWriteStream('read.mp3'));*/
