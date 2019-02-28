import * as React from "react";
import { FlexLayout, Button } from "./ui/ui";

export class Prompt extends React.PureComponent<{}, { accepted?: boolean }> {
    accepted = false;
    constructor(props: any) {
        super(props);
        this.state = { accepted: localStorage.getItem('shown') === 'true' };
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
            <FlexLayout style={{ width: '100%', flexDirection: 'row', backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' }}>
                <div style={{ flexGrow: 1, margin: 20 }}>
                    <span style={{ color: 'white' }}>By using this website you agree with our <a style={{ color: 'white' }} href="/legal/privacy-policy">Privacy Policy</a>, <a style={{ color: 'white' }} href="legal/terms-and-conditions">Terms &amp; Conditions</a> and <a style={{ color: 'white' }} href="legal/cookie-policy">Cookie Policy</a></span>
                </div>
                <Button style={{ marginRight: 20, backgroundColor: 'black', color: 'white' }} onClick={this.onAccepted}>Got it!</Button>
            </FlexLayout>
        );
    }
}