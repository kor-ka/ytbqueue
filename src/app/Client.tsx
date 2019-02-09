import * as React from "react";
import * as Cookie from 'js-cookie';
import { QueueSession } from "./model/session";
import { QueueContent, Content } from "../../server/src/model/entity";
import { FlexLayout, Input } from "./ui/ui";
import * as youtubeSearch from "youtube-search";


export const endpoint = window.location.hostname.indexOf('localhost') >= 0 ? 'http://localhost:5000' : '';

export class Client extends React.PureComponent<{}, { playing?: QueueContent, queue: QueueContent[] }> {
    constructor(props: any) {
        super(props);
        this.state = { queue: [] };
    }
    id = window.location.pathname.split('/').filter(s => s.length)[0];
    token = Cookie.get('ytb_queue_token_' + this.id);
    clientId = Cookie.get('ytb_queue_client');
    session = new QueueSession(this.id, this.token, this.clientId);
    componentDidMount() {
        this.session.onPlayingChange(p => this.setState({ playing: p }))
        this.session.onQueueChange(q => this.setState({ queue: q }))
        // fetch(endpoint + '/next/' + this.id, { method: 'POST' }).then();
    }

    render() {
        return (
            <FlexLayout style={{ flexDirection: 'column', alignItems: 'center', marginTop: 20 }}>
                {this.state.playing && '▶️ ' + this.state.playing!.title}
                <Searcher session={this.session} />
                {this.state.queue.map(c => c.title)}
            </FlexLayout>
        )
    }
}

export class Searcher extends React.PureComponent<{ session: QueueSession }, { q: string, results: Content[] }>{
    constructor(props: any) {
        super(props);
        this.state = { q: '', results: [] };
    }
    generation = 0;


    onInputChange = (event: React.FormEvent<HTMLInputElement>) => {
        let q = event.currentTarget.value;
        if (q) {
            this.setState({ q })
            var opts: youtubeSearch.YouTubeSearchOptions = {
                maxResults: 10,
                key: "AIzaSyBW-5ayHQTRcrELnx5gKJcjJc16qn2wlfk"
            };

            let g = ++this.generation;
            youtubeSearch(q, opts, (err, results) => {
                if (!err && g === this.generation) {
                    this.setState({ results: results.map(r => ({ title: r.title, id: r.id, url: r.link })) })
                }
            });
        } else {
            this.setState({ q: '', results: [] })
        }
    }

    onSelect = (conent: Content) => {
        this.setState({ q: '', results: [] })
        this.props.session.add(conent);
    }

    render() {
        return (
            <FlexLayout style={{ flexDirection: 'column', alignItems: 'center' }}>
                <Input value={this.state.q} onChange={this.onInputChange} />
                {this.state.q && this.state.results.map(r => (
                    <FlexLayout style={{ flexDirection: 'row', height: 50 }} onClick={() => this.onSelect(r)}>
                        {/* TBD frame */}
                        {r.title}
                    </FlexLayout>
                ))}
            </FlexLayout>
        );
    }
}