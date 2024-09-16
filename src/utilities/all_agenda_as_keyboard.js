const { getAllAgendaPaymentBySender } = require("../DB/querys/querys");

async function allAgendaAsKeyboard(userID,name, next) {
    await getAllAgendaPaymentBySender(userID, (result) => {
            
        if(result) {
            const allAgendaList= [];
            result.forEach(d => {
                allAgendaList.push({
                    text: `${d.title}\n${d.date}`, callback_data: d.id
                })

            });
            const groupedAgenda = allAgendaList.reduce((acc, cur, idx) => {
                if(idx % 2=== 0) {
                    acc.push([cur])
                }else{
                    acc[acc.length - 1].push(cur);
                }
                return acc;
            },[]);

            const buttons = groupedAgenda.map(b => b.map(bk => ({
                text: bk.text,
                callback_data: `${name}_${bk.callback_data}`
            })))
            return next(buttons);
        }

    })
}

module.exports = allAgendaAsKeyboard