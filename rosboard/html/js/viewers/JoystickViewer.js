"use strict";

class JoystickViewer extends Viewer {
    /**
    * Gets called when Viewer is first initialized.
    * @override
    **/
    onCreate() {
        this.viewerNode = $('<div id="zone_joystick"></div>')
            .css({'font-size': '11pt'})
            .appendTo(this.card.content);

        this.viewerNodeFadeTimeout = null;

        this.expandFields = { };
        this.fieldNodes = { };
        this.dataTable = $('<table></table>')
                .addClass('mdl-data-table')
                .addClass('mdl-js-data-table')
                .css({'width': '100%', 'min-height': '30pt', 'table-layout': 'fixed' })
                .appendTo(this.viewerNode);
        this.createJoystick();
        this.status="Closed";
        this.ros = new ROSLIB.Ros();
        this.ros.on('connection', () => {
            this.status = "Connected";
        });

        this.ros.on('error', (error) => {
            this.status = "Error";
        });

        this.ros.on('close', () => {
            this.status = "Closed";
        });
        
        this.linear_speed = 0.;
        this.angular_speed = 0.;

        this.cmd_vel_listener = new ROSLIB.Topic({
            ros: this.ros,
            name: "/cmd_vel",
            messageType: 'geometry_msgs/Twist'
        });

        super.onCreate();
    }
    
    move(linear, angular) {
        var twist = new ROSLIB.Message({
            linear: {
            x: linear,
            y: 0,
            z: 0
            },
            angular: {
            x: 0,
            y: 0,
            z: angular
            }
        });
        this.cmd_vel_listener.publish(twist);
    }
    
    createJoystick() {
      var options = {
        zone: document.getElementById("zone_joystick"),
        threshold: 0.1,
        position: { left: 50 + '%' },
        size: 150,
        color: 'red',
      };
      this.manager = nipplejs.create(options);

      this.manager.on('start', (event, nipple) => {
        this.timer = setInterval( () => {
          this.move(this.linear_speed, this.angular_speed);
        }, 25);
      });

      this.manager.on('move', (event, nipple) => {
        const max_linear = 5.0; // m/s
        const max_angular = 2.0; // rad/s
        const max_distance = 75.0; // pixels;
        this.linear_speed = Math.sin(nipple.angle.radian) * max_linear * nipple.distance/max_distance;
				this.angular_speed = -Math.cos(nipple.angle.radian) * max_angular * nipple.distance/max_distance;
      });

      this.manager.on('end', () => {
        if (this.timer) {
          clearInterval(this.timer);
        }
        this.move(0, 0);
      });
    }
    
    onData(data) {
      this.card.title.text(data._topic_name);
      
      let tr = $('<tr></tr>')
        .appendTo(this.dataTable);
        $('<td></td>')
        .addClass('mdl-data-table__cell--non-numeric')
        .text("Status")
        .css({'width': '40%', 'font-weight': 'bold', 'overflow': 'hidden', 'text-overflow': 'ellipsis'})
        .appendTo(tr);
      this.fieldNodes["Status"] = $('<td></td>')
        .addClass('mdl-data-table__cell--non-numeric')
        .addClass('monospace')
        .css({'overflow': 'hidden', 'text-overflow': 'ellipsis'})
        .appendTo(tr);
      let that = this;
      this.fieldNodes["Status"].click(() => {that.expandFields["Status"] = !that.expandFields["Status"]; });
      if (this.status=="Closed"){
          this.fieldNodes["Status"].text("Closed");
          this.fieldNodes["Status"].css({"color": "#ffff00"});
      }
      else if (this.status=="Error"){
          this.fieldNodes["Status"].text("Error");
          this.fieldNodes["Status"].css({"color": "#ff0000"});
      }
      else if (this.status=="Connected"){
          this.fieldNodes["Status"].text("Connected");
          this.fieldNodes["Status"].css({"color": "#00ff00"});
      }
      
      
      for(let field in data) {
          if(field[0] === "_") continue;
          // if(field === "header") continue;
          // if(field === "name") continue;

          if(!this.fieldNodes[field]) {
              let tr = $('<tr></tr>')
                .appendTo(this.dataTable);
              $('<td></td>')
                .addClass('mdl-data-table__cell--non-numeric')
                .text(field)
                .css({'width': '40%', 'font-weight': 'bold', 'overflow': 'hidden', 'text-overflow': 'ellipsis'})
                .appendTo(tr);
              this.fieldNodes[field] = $('<td></td>')
                .addClass('mdl-data-table__cell--non-numeric')
                .addClass('monospace')
                .css({'overflow': 'hidden', 'text-overflow': 'ellipsis'})
                .appendTo(tr);
              let that = this;
              this.fieldNodes[field].click(() => {that.expandFields[field] = !that.expandFields[field]; });
          }

        if(data[field].uuid) {
            this.fieldNodes[field].text(data[field].uuid.map((byte) => ((byte<16) ? "0": "") + (byte & 0xFF).toString(16)).join(''));
            this.fieldNodes[field].css({"color": "#808080"});
            continue;
        }
        
        if(typeof(data[field])==="boolean") {
          if(data[field] === true) {
              this.fieldNodes[field].text("true");
              this.fieldNodes[field].css({"color": "#80ff80"});
          } else {
              this.fieldNodes[field].text("false");
              this.fieldNodes[field].css({"color": "#ff8080"});
          }
          continue;
        }

        if(data.__comp && data.__comp.includes(field)) {
          this.fieldNodes[field][0].innerHTML = "(compressed)";
          continue;
        }

        if(this.expandFields[field]) {
          this.fieldNodes[field][0].innerHTML = (
            JSON.stringify(data[field], null, '  ')
              .replace(/\n/g, "<br>")
              .replace(/ /g, "&nbsp;")
          );
        } else {
          this.fieldNodes[field][0].innerHTML = JSON.stringify(data[field], null, '  ');
        }
      }
    }
}

JoystickViewer.friendlyName = "Control plot and override";

JoystickViewer.supportedTypes = [
    "geometry_msgs/msg/Twist",
];

JoystickViewer.maxUpdateRate = 30.0;

Viewer.registerViewer(JoystickViewer);
