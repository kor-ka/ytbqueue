import * as React from "react";
import * as Cookie from 'js-cookie';
import { QueueSession } from "./model/session";
import { QueueContent } from "../../server/src/model/entity";
import YouTube from "react-youtube";
import { FlexLayout } from "./ui/ui";

export const endpoint = window.location.hostname.indexOf('localhost') >= 0 ? 'http://localhost:5000' : '';

export class Host extends React.PureComponent<{}, { playing?: QueueContent }> {
    constructor(props: any) {
        super(props);
        this.state = {};
    }
    id = window.location.pathname.split('/').filter(s => s.length)[0];
    token = Cookie.get('ytb_queue_token_' + this.id);
    clientId = Cookie.get('ytb_queue_client');
    session = new QueueSession(this.id, this.token, this.clientId);

    componentDidMount() {
        this.session.onPlayingChange(p => this.setState({ playing: p }))
        // fetch(endpoint + '/next/' + this.id, { method: 'POST' }).then();
    }
    render() {
        if (this.state.playing) {
            return <Player session={this.session} id={this.state.playing.id} qid={this.state.playing.queueId} />;
        }
        return (this.id || 'nothong') + ' - ' + 'HOST';

    }
}

class Player extends React.PureComponent<{ session: QueueSession, id: string, qid: string }>{
    _onReady(event) {
        // access to player in all event handlers via event.target
        event.target.playVideo();
    }
    render() {
        return (
            <YouTube onReady={this._onReady} videoId={this.props.id} opts={{ width: window.innerWidth + '', height: window.innerHeight + '', playerVars: { autoplay: 1 } }} onEnd={() => this.props.session.next(this.props.qid)} />
        );
    }
}