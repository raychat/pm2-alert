const request = require('request');


module.exports.send = params => {

    return new Promise((resolve, reject) => {


        params.headers = {
            'Content-type': 'application/json'
        }
        console.log(params)
        request.post(params, function (err, httpResponse, body) {
            if (err) {
                reject(err)
            }
            resolve(body)
        })

    })

}



