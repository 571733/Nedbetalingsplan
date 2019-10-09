document.getElementById('laane').addEventListener("keyup", validateLaaneInput);
document.getElementById('rente').addEventListener("keyup", validateRenteInput);
document.getElementById('gebyr').addEventListener("keyup", validateGebyrInput);

let laanDisable = false;
let renteDisable = false;
let gebyrDisable = false;

function validateLaaneInput() {
    let laane = document.getElementById('laane').value;
    let laanFeil = document.getElementById("laanFeil");

    let regex = /[^0-9]/g;
    if (regex.test(laane) || laane.length === 0) {
        laanFeil.innerHTML = "Du kan kun benytte tallene 0-9";
        document.getElementById('clickMe').disabled = true
        laanDisable = true
    } else {
        laanDisable = false
        laanFeil.innerHTML = "";
        console.log(laanDisable)
        console.log(gebyrDisable)
        console.log(renteDisable)
        if (!gebyrDisable && !renteDisable) {
            document.getElementById('clickMe').disabled = false
        }
    }

}

function validateRenteInput() {
    let rente = document.getElementById('rente').value;
    let renteFeil = document.getElementById('renteMax');
    let regex = /[^0-9]/g;

    if (regex.test(rente) || rente > 15 || rente.length === 0) {
        renteFeil.innerHTML = "Du kan kun benytte tallene 0-9. Maks rentesats er 15";
        document.getElementById('clickMe').disabled = true
        renteDisable = true
    } else {
        renteDisable = false
        renteFeil.innerHTML = "";
        if (!laanDisable && !gebyrDisable) {
            document.getElementById('clickMe').disabled = false
        }
    }

}

function validateGebyrInput() {
    let gebyr = document.getElementById('gebyr').value
    let melding = document.getElementById('gebyrmelding')
    let regex = /[^0-9]/g;

    if (regex.test(gebyr) || gebyr.length === 0) {
        melding.innerHTML = "Du kan kun benytte tallene 0-9";
        document.getElementById('clickMe').disabled = true
        gebyrDisable = true
    } else {
        gebyrDisable = false
        melding.innerHTML = "";
        if (!laanDisable && !renteDisable) {
            document.getElementById('clickMe').disabled = false
        }
    }

}

function getInputData() {
    let dataSource = document.getElementById("inputs");
    let dataInput = {
        laanebelop: dataSource[0].value,
        nominellRente: dataSource[1].value,
        terminGebyr: dataSource[2].value,
        utlopsDato: dataSource[3].value,
        saldoDato: dataSource[4].value,
        datoForsteInnbetaling: dataSource[5].value,
        ukjentVerdi: "TERMINBELOP"
    };
    return dataInput
}

function planlegging() {
    destroyMineGrafer();
    let payload = getInputData();
    sendToAPI(payload)
}

function sendToAPI(payload) {
    fetch('https://visningsrom.stacc.com/dd_server_laaneberegning/rest/laaneberegning/v1/nedbetalingsplan', {
        method: 'post',
        mode: 'cors',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify(payload)
    })
        .then((res) => res.json())
        .then((data) => {
            lagNedbetalingsplan(data);
            restgjeldGraf(data);
            RenterOgAvdragChart(data);
        })
        .catch(error => console.log(error));
}


function lagNedbetalingsplan(data) {
    if (data.valideringsfeilmeldinger !== null) {
        document.getElementById('datokluss').innerHTML = data.valideringsfeilmeldinger.feilmelding
        return;
    }
    document.getElementById('datokluss').innerHTML = "";
    const tabell = document.getElementById('plan');
    $("#plan tr").remove();

    let header = document.createElement('tr');
    let restgjeldth = document.createElement('th');
    let datoth = document.createElement('th');
    let terminbelopth = document.createElement('th');
    let renterth = document.createElement('th');
    let avdragth = document.createElement('th');

    restgjeldth.innerHTML = "Restgjeld";
    datoth.innerHTML = "Dato";
    terminbelopth.innerHTML = "Terminbeløp";
    renterth.innerHTML = "Renter";
    avdragth.innerHTML = "Avdrag";

    tabell.appendChild(header);
    header.appendChild(restgjeldth);
    header.appendChild(datoth);
    header.appendChild(terminbelopth);
    header.appendChild(renterth);
    header.appendChild(avdragth);

    let size = data.nedbetalingsplan.innbetalinger.length;
    let sumRenter = 0;
    let sumGebyr = 0;
    let sumInnbet = 0;

    let i;
    for (i = 0; i < size; i++) {
        let trNode = document.createElement('tr')
        let restgjeldtd = document.createElement('td')
        let datotd = document.createElement('td')
        let terminbeloptd = document.createElement('td')
        let rentertd = document.createElement('td')
        let avdragtd = document.createElement('td')

        restgjeldtd.innerHTML = data.nedbetalingsplan.innbetalinger[i].restgjeld.toFixed(2)
        datotd.innerHTML = data.nedbetalingsplan.innbetalinger[i].dato
        terminbeloptd.innerHTML = data.nedbetalingsplan.innbetalinger[i].total.toFixed(2)
        rentertd.innerHTML = data.nedbetalingsplan.innbetalinger[i].renter.toFixed(2)
        avdragtd.innerHTML = data.nedbetalingsplan.innbetalinger[i].innbetaling.toFixed(2)

        sumRenter += data.nedbetalingsplan.innbetalinger[i].renter
        sumGebyr += data.nedbetalingsplan.innbetalinger[i].gebyr
        sumInnbet += data.nedbetalingsplan.innbetalinger[i].total

        tabell.appendChild(trNode);
        trNode.appendChild(restgjeldtd);
        trNode.appendChild(datotd);
        trNode.appendChild(terminbeloptd);
        trNode.appendChild(rentertd);
        trNode.appendChild(avdragtd);
    }
    document.getElementById('rentekostnad').innerHTML = `\- Lånets totale rentekostnader er kr ${sumRenter.toFixed(2)} <br>
    \- Lånets totale gebyrkostnader er kr ${sumGebyr.toFixed(2)}<br>
    \- Lånets totale kostnad er kr ${sumInnbet.toFixed(2)}`;
}

function destroyMineGrafer() {
    if (tempRestGraf) {
        tempRestGraf.destroy();
    }
    if (renteogAvdragGraf) {
        renteogAvdragGraf.destroy();
    }
}

let tempRestGraf;
function restgjeldGraf(data) {

    let dato = [];
    data.nedbetalingsplan.innbetalinger.forEach(elem => (dato.push(elem.dato)));

    let restgjeld = [];
    data.nedbetalingsplan.innbetalinger.forEach(elem => (restgjeld.push(elem.restgjeld)));

    tempRestGraf = new Chart(document.getElementById("chart"), {
        type: "line",
        data: {
            labels: dato,
            datasets: [
                {
                    data: restgjeld,
                    text: "Restgjeld",
                    label: "Restgjeld",
                    borderColor: "green",
                    fill: false
                }
            ]
        },
        options: {
            title: {
                display: true,
                text: "Restgjeldsutviklig",
                fontSize: 20
            }
        }
    });

}

let renteogAvdragGraf;
function RenterOgAvdragChart(data) {

    let dato = [];
    data.nedbetalingsplan.innbetalinger.forEach(elem => (dato.push(elem.dato)));

    let avdrag = []
    data.nedbetalingsplan.innbetalinger.forEach(elem => (avdrag.push(elem.innbetaling)));

    let renter = []
    data.nedbetalingsplan.innbetalinger.forEach(elem => (renter.push(elem.renter)));

    renteogAvdragGraf = new Chart(document.getElementById("roga"), {
        type: "line",
        data: {
            labels: dato,
            datasets: [
                {
                    data: avdrag,
                    text: "Avdrag",
                    label: "Avdrag",
                    borderColor: "forestgreen",
                    fill: false
                },
                {
                    data: renter,
                    text: "Renter",
                    label: "Renter",
                    borderColor: "lime",
                    fill: false
                }
            ]
        },
        options: {
            title: {
                display: true,
                text: "Renter og avdrag",
                fontSize: 20
            }
        }
    });
}