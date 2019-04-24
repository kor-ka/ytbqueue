import * as React from "react";
import { FlexLayout, Button } from "./ui/ui";

export class Prompt extends React.PureComponent<{}, { accepted?: boolean }> {
    accepted = false;
    constructor(props: any) {
        super(props);
        this.state = { accepted: localStorage.getItem('shown') === 'true' && false };
    }

    onAccepted = () => {
        localStorage.setItem('shown', 'true');
        this.setState({ accepted: true });
    }

    render() {
        if (this.state.accepted) {
            return null;
        }

        return (
            <FlexLayout style={{ width: '100%', flexDirection: 'row', backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', borderBottom: '1px solid #bbb' }}>
                <div style={{ flexGrow: 1, margin: 20, fontWeight: 300 }}>
                    <span style={{ color: '#000' }}>By using this website you agree with our <a style={{ color: '#000' }} href="/legal/privacy-policy">Privacy&nbsp;Policy</a>, <a style={{ color: '#000' }} href="legal/terms-and-conditions">Terms&nbsp;&amp;&nbsp;Conditions</a> and <a style={{ color: '#000' }} href="legal/cookie-policy">Cookie&nbsp;Policy</a></span>
                </div>
                <Button style={{ marginRight: 20, backgroundColor: '#fff', color: '#000', fontWeight: 300, borderRadius: 10, border: '1px solid black' }} onClick={this.onAccepted}>OK</Button>
            </FlexLayout>
        );
    }
}