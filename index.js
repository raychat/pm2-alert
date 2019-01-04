const func = require('./lib/func')
const chttp = require('./lib/http')
const pm2 = require('pm2')
const cron = require('node-cron');

class pm2_alert {

    constructor(config) {

        const _this = this;
        _this._config = config
        _this._processes = []


        _this._setProcess(_this._config.processes)
            .then(() => {

                _this._setCron(_this._config.memory.cron, 'memory')
                // _this._launchBus(_this._config.events);
                console.log(`pm2-alert is listening for these processes: ${_this._processes.toString()}`);
            })
            .catch(err => {
                console.error(err)
                process.exit()
            })


    }



    /**
     * define which process should be monitored
     * @param {Array} processes
     */
    _setProcess(processes) {

        return new Promise((resolve, reject) => {
            if (!Array.isArray(processes)) {
                reject('invalid processes')

            } else if (Array.isArray(processes) && processes.length > 0) {
                this._processes = processes
                resolve()

            } else {

                pm2.list((err, list) => {
                    if (err || list.length === 0) reject('something went wrong with your processes, please check you processes list via pm2 l')
                    list.forEach((proc) => {
                        this._processes.push(proc.name)
                    })
                    resolve()

                })
            }
        })
    }



    /**
     * set cron job
     * @param {String} cronEx 
     * @param {String} method 
     */
    _setCron(cronEx, method) {
        cron.schedule(cronEx, () => {
            if (method === 'memory') this._checkMemory()
        });

    }



    /**
     * check memory of process
     * if reach the config.memory.maxMemroySize send notification 
     */
    _checkMemory() {

        console.log('check memory called')

        const _this = this;
        pm2.list((err, list) => {
            if (err || list.length === 0) {
                console.error('something went wrong with your processes, please check you processes list via pm2 l')
                process.exit()
            }
            list.forEach((proc) => {




                // if process is being enabled to monitoring then check memory of process
                if (_this._processes.indexOf(proc.name) !== -1) {


                    // if process memory more than alert.maxMemroySize then send notification
                    if (proc.monit.memory >= _this._config.memory.maxMemroySize) {


                        let server = '';
                        if (_this._config.info) server = _this._config.info.serverName || 'UNKNOWN SERVER'


                        if (_this._config.target === 'custom') {
                            let msg = `🛎 ${_this._config.memory.warning[0].pretext}\n
Event:      \`\`\` Memory leak\`\`\` \n
Server:     \`\`\` ${server} \`\`\` \n
Process id/name/status:    \`\`\` ${proc.pm_id} ${proc.name}  ${proc.pm2_env.status} \`\`\`\n
Memory & Cpu: \`\`\` ${func.bytesToSize(proc.monit.memory)} & ${proc.monit.cpu}% \`\`\`\n
Restart time: \`\`\` ${proc.pm2_env.restart_time} \`\`\`\n
${_this._config.memory.warning[0].footer}`

                            chttp.send({
                                url: _this._config.to,
                                json: { "msg": msg }
                            })
                                .then(res => {
                                    console.log('notification sent!')
                                })
                                .catch(err => {
                                    console.error(err)

                                })
                        } else {
                            let fields = [
                                {
                                    "title": "Event",
                                    "value": "Memory leak",
                                    "short": false
                                },
                                {
                                    "title": "Server",
                                    "value": server,
                                    "short": false
                                },
                                {
                                    "title": "Process id/name/status",
                                    "value": `${proc.pm_id}.${proc.name}: ${proc.pm2_env.status}`,
                                    "short": false
                                },
                                {
                                    "title": "Memory & Cpu",
                                    "value": `${func.bytesToSize(proc.monit.memory)} & ${proc.monit.cpu}%`,
                                    "short": false
                                },
                                {
                                    "title": "Restart time",
                                    "value": `${proc.pm2_env.restart_time}`,
                                    "short": false
                                }
                            ]

                            if (!Array.isArray(_this._config.memory.warning)) {
                                console.error('configuration problem, please check your config file')
                            }

                            _this._config.memory.warning[0].fields = fields

                            chttp.send({
                                url: _this._config.to,
                                json: { "attachments": _this._config.memory.warning }
                            })
                                .then(res => {
                                    console.log('notification sent!')
                                })
                                .catch(err => {
                                    console.error(err)

                                })
                        }





                    }




                }
            })


        })







    }




    _launchBus(events) {
        const _this = this;
        pm2.launchBus(function (err, bus) {



            bus.on('process:event', packet => {
                if (events.indexOf(packet.event) != -1) {
                    console.log(packet)
                    let fields = [
                        {
                            "title": "Event",
                            "value": packet.event,
                            "short": false
                        },
                        {
                            "title": "Server",
                            "value": _this._config.info.serverName || 'UNKNOWN SERVER',
                            "short": false
                        },
                        {
                            "title": "Process id/name/status",
                            "value": `${packet.pm_id}.${packet.name}: ${packet.process.status}`,
                            "short": false
                        },

                        {
                            "title": "Restart time",
                            "value": `${packet.process.restart_time}`,
                            "short": false
                        }
                    ]

                    _this._config.memory.warning[0].fields = fields

                    chttp.send({
                        url: _this._config.to,
                        json: { "attachments": _this._config.memory.warning }
                    }).then(res => {
                        console.log('notification sent!')
                    })
                        .catch(err => {
                            console.error(err)

                        })




                }
            })


        });
    }


}


module.exports = pm2_alert;