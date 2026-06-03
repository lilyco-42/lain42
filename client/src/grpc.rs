use tonic::metadata::MetadataValue;
use tonic::transport::Channel;
use tonic::Request;

pub mod proto {
    tonic::include_proto!("lain42");
}

use proto::{config_sync_client::ConfigSyncClient, *};

pub struct LainClient {
    client: ConfigSyncClient<Channel>,
    token: String,
}

impl LainClient {
    pub async fn connect(
        server_url: &str,
        token: &str,
    ) -> Result<Self, Box<dyn std::error::Error>> {
        let uri = format!("http://{}", server_url.trim_start_matches("http://"));
        let channel = Channel::from_shared(uri)?.connect().await?;
        Ok(LainClient {
            client: ConfigSyncClient::new(channel),
            token: token.to_string(),
        })
    }

    fn auth_request<T>(&self, req: T) -> Request<T> {
        let mut request = Request::new(req);
        if !self.token.is_empty() {
            let token: MetadataValue<_> =
                format!("Bearer {}", self.token).parse().unwrap();
            request.metadata_mut().insert("authorization", token);
        }
        request
    }

    pub async fn check_updates(
        &mut self,
        locals: Vec<ConfigVersion>,
    ) -> Result<CheckUpdatesResponse, tonic::Status> {
        let req = CheckUpdatesRequest {
            local_configs: locals,
        };
        let resp = self.client.check_updates(self.auth_request(req)).await?;
        Ok(resp.into_inner())
    }

    pub async fn pull_config(
        &mut self,
        post_id: &str,
    ) -> Result<PullConfigResponse, tonic::Status> {
        let req = PullConfigRequest {
            post_id: post_id.to_string(),
        };
        let resp = self.client.pull_config(self.auth_request(req)).await?;
        Ok(resp.into_inner())
    }

    pub async fn list_subscriptions(
        &mut self,
    ) -> Result<ListSubscriptionsResponse, tonic::Status> {
        let req = ListSubscriptionsRequest {};
        let resp = self
            .client
            .list_subscriptions(self.auth_request(req))
            .await?;
        Ok(resp.into_inner())
    }
}
