const {
    allFulfilled,
    allFulfilledV2,
    makeRetry
} = require('./promise-enhance');

test('allFulfilled should resolve when each of the promises resolves.', async () => {
    expect.assertions(1);
    const data = await allFulfilled([Promise.resolve(0), Promise.reject(1), Promise.resolve(2)]);
    expect(data).toEqual([{
        result: 0,
        state: true
    }, {
        result: 1,
        state: false
    }, {
        result: 2,
        state: true
    }]);
});

test('allFulfilledV2 should resolve when each of the promises resolves.', async () => {
    expect.assertions(1);
    const data = await allFulfilledV2([Promise.resolve(0), Promise.reject(1), Promise.resolve(2)]);
    expect(data).toEqual([{
        result: 0,
        state: true
    }, {
        result: 1,
        state: false
    }, {
        result: 2,
        state: true
    }]);
});

test('makeRetry should make retries', async () => {
    expect.assertions(1);
    const data = await makeRetry(5, (function () {
        var counter = 0;
        return function () {
            return new Promise((resolve, reject) => {
                setTimeout(function () {
                    if (counter === 3)
                        resolve(counter++);
                    else
                        reject(counter++);
                }, 1000);
            });
        };
    })());
    expect(data).toBe(3);
});