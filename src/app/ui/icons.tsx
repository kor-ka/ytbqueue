import * as React from "react";

export let Skip = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" /><path d="M0 0h24v24H0z" fill="none" /></svg>

export let Clear = (props: { color?: string }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill={props.color} /><path d="M0 0h24v24H0z" fill="none" /></svg>

export let Arrow = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="#fff" d="M14 7l-5 5 5 5V7z" /><path fill="none" d="M24 0v24H0V0h24z" /></svg>