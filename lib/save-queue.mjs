export function createSaveQueue({read,saved,write,commit}) {
  let active=null;
  return function flush(){
    if(active)return active;
    if(read()===saved())return Promise.resolve();
    active=(async()=>{while(read()!==saved()){const snapshot=read();await write(snapshot);commit(snapshot);}})().finally(()=>{active=null;});
    return active;
  };
}
