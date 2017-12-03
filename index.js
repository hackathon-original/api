//
// Openbanking
//

let app = require('express')();
let http = require('http').Server(app);
let io = require('socket.io')(http);

let path = require('path');
let request = require('superagent');

const btc = require('./bitcoin');
const operations = require('./operations');

//
// Configurations
//

const port = 3001
let url = `http://localhost:${port}/`;

let api_url = 'https://sandbox.original.com.br';
let auth_url = 'https://sb-autenticacao-api.original.com.br';
let auth_callback_url = `http://localhost:${port}/callback`
let developer_key = '28f955c90b3a2940134ff1a970050f569a87facf';
let secret_key = 'dd385cd0b59c013560400050569a7fac';
let access_token = '';

//
// Resources
//

let amount = '10.00';
let account_number = '222222';
let comments = 'Transferência';
let favored_id = '2';

let resources = {
    balance: {
        method: 'get',
        path: '/accounts/v1/balance'
    },
    balance_history: {
        method: 'get',
        path: '/accounts/v1/balance-history?date_from=20170623'
    },
    'transaction-history': {
        method: 'get',
        path: '/accounts/v1/transaction-history'
    },
    rewards: {
        method: 'get',
        path: '/rewards/v1/balance'
    },
    'rewards/history': {
        method: 'get',
        path: '/rewards/v1/transaction-history'
    },
    'cards': {
        method: 'get',
        path: '/cards/v1'
    },
    'cards/detail': {
        method: 'get',
        path: '/cards/v1/0001'
    },
    'cards/invoices/open': {
        method: 'get',
        path: '/cards/v1/0001/invoices/open'
    },
    'cards/invoices/closed': {
        method: 'get',
        path: '/cards/v1/0001/invoices/closed'
    },
    'cards/invoices/history': {
        method: 'get',
        path: '/cards/v1/0001/invoices/history'
    },
    history: {
        method: 'get',
        path: '/accounts/v1/transaction-history'
    },
    favored_accounts: {
        method: 'get',
        path: '/payments/v1/money-transfer/favored-accounts'
    },
    tef: {
        title: 'Confirme a transferência de R$ 10,00',
        method: 'post',
        path: '/payments/v2/money-transfer/between-accounts',
        data: {
            amount,
            comments,
            callback_url: 'http://localhost:3001/',
            favored_id,
            // account_number
        }
    },
    tef_confirm: {
        title: 'Transferência executada com sucesso.',
        method: 'put',
        path: '/payments/v2/money-transfer/between-accounts',
        headers: {
            security_response: ''
        },
        data: {
            amount,
            comments,
            callback_url: `${url}`,
            favored_id,
            // account_number
        }
    }
};

let show = (...messages) => {
    io.emit('message', messages.map(message => JSON.stringify(message, null, 4)));
    console.log(messages);
};

let execute_api = name => {
    callResource(name);
};

//
// OAuth
//

app.get('/', (req, res) => {
    url = req.headers.host;
    auth_callback_url = 'http://' + req.headers.host + '/callback';
    console.log('/', auth_callback_url);
    res.sendFile(path.join(`${__dirname}/index.html`));
});

app.get('/oauth', (req, res) => {
    let url = `${auth_url}/OriginalConnect?scopes=account&callback_url=${auth_callback_url}&callback_id=1&developer_key=${developer_key}`;
    show('Starting oauth', `Redirect to ${url}`);
    res.redirect(url);
});

// Access_token generation

app.get('/callback', (req, res) => {
    show(
        'Callback oauth received',
        req.query,
        'Requesting access token'
    );

    request
        .post(`${auth_url}/OriginalConnect/AccessTokenController`)
        .set('Content-Type', 'application/json')
        .send({
            auth_code: req.query.auth_code,
            uid: req.query.uid,
            developer_key,
            secret_key
        })
        .end((err, response) => {
            show(
                'Response', response.statusMessage, response.statusCode,
                'Headers', response.headers,
                'Content', response.text
            );

            access_token = response.body.access_token;

            res.send('<script>window.close();</script>');
        });
});


for (let resource in resources) {
    createResource(resource);
}

function createResource(name) {
    app.get(`/${name}`, (req, response) => {
        callResource(name)
            .then(
            body => response.send(body),
            err => response.send({ error: 'not authenticated' }));
    });
}

app.get('/brl-btc/:amount*?', (req, res) => {
    btc.convertFromBtc("BRL", Number(req.params.amount))
        .then(t => res.send({ buy: t }));
});

app.get('/btc-brl/:amount*?', (req, res) => {
    btc.convertToBtc("BRL", Number(req.params.amount))
        .then(v => res.send({ buy: v }));
});

app.post('/apply-btc', (req, res) => {
    let { amount_cc, amount_rewards } = req.query;
    operations.addAccountOperation(-Number(amount_cc));
    operations.addRewardsOperation(-Number(amount_rewards));
    callResource('balance')
        .then(balance => balance.current_value)
        .then(value => {
            let result = {
                balance: operations.calculateAccountOps(value),
                rewards: operations.calculateRewardsOps(value)
            };
            res.send(result);
        });
})

io.on('connection', socket => {
    socket.on('operation', operation => {
        execute_api(operation);
    });

    socket.on('exec', text => {
        let res = null;
        try {
            res = eval(text);
        } catch (e) {
            res = `${e.message}`;
        }
        if (res) {
            show(res);
        }
    });
});

http.listen(port, () => {
    console.log('OpenBanking Debugger');
    console.log(`${url}`);
});

function callResource(name) {
    return new Promise((resolve, reject) => {
        let resource = resources[name];
        show(`EXECUTING - req - ${name}`);
        let action =
            request
            [resource.method](`${api_url}${resource.path}`)
                .set('developer-key', developer_key)
                .set('Authorization', access_token);

        if ('headers' in resource)
            for (let key in resource.headers)
                action.set(key, resource.headers[key]);

        if ('data' in resource)
            action.send(resource.data);

        show(action);

        action.end((err, res) => {
            if (err) {
                show(err);
                reject(err);
            }
            else {
                show(res.body);
                resolve(res.body);

                if ('security_message' in res.body) {
                    resources.tef_confirm.headers.security_response = res.body.security_message
                }
            }
        });
    });
}