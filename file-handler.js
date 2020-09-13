import fs from "fs";

const mapDir = "maps/";

export let lastMap = fs.readFileSync("last-map.txt", "utf-8").replace(".json", "").replace("\n", "").replace("\r", "");
export let subscribedOnFileChange = [];
export let fileContent;

loadMap(lastMap);

export function subscribeOnFileChange(method) {
    subscribedOnFileChange.push(method);
}

export function loadMap(name) {
    saveLastMap(name)
    fileContent = getMapContent(name);
    notifySevices();
}

function notifySevices() {
    subscribedOnFileChange.forEach(service => service());
}

export function saveLastMap(name) {
    fs.writeFileSync("last-map.txt", name ? name + ".json" : lastMap);
}

export function getMapContent(name) {
    let filename = name ? name + ".json" : lastMap;
    return JSON.parse(fs.readFileSync(mapDir + filename, "utf-8"));
}

export function deleteMap(name) {
    if (lastMap.replace(".json", "") === name)
        throw new Error("You cannot delete the last or current map");

    fs.unlinkSync(mapDir + name + ".json");
}

export function getAllMaps() {
    return fs.readdirSync(mapDir).map(a => {
        return {
            name: a.replace(".json", ""),
            selected: a === lastMap
        }
    });
}

export function setFileContent(content) {
    fileContent = {...fileContent, ...content};
    console.log(fileContent)
    saveCurrentMap(lastMap);
}

export function saveCurrentMap(filename) {
    fs.writeFileSync(mapDir + filename + ".json", JSON.stringify(fileContent));
}