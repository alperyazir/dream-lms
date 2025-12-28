"""
Webhook Registration Service

Handles automatic registration of webhooks with Dream Central Storage.
Can be called on startup or manually via admin endpoint.
"""

import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class WebhookRegistrationService:
    """Service to register webhooks with Dream Central Storage."""

    def __init__(self):
        self.dream_storage_url = settings.DREAM_CENTRAL_STORAGE_URL
        self.dream_storage_email = settings.DREAM_CENTRAL_STORAGE_EMAIL
        self.dream_storage_password = settings.DREAM_CENTRAL_STORAGE_PASSWORD
        self.webhook_secret = settings.DREAM_CENTRAL_STORAGE_WEBHOOK_SECRET
        self.webhook_url = f"{settings.SERVER_HOST}/api/v1/webhooks/dream-storage"

    async def get_dream_storage_token(self) -> str | None:
        """
        Get admin access token from Dream Central Storage.

        Returns:
            Access token if successful, None otherwise
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.dream_storage_url}/auth/login",
                    json={
                        "email": self.dream_storage_email,
                        "password": self.dream_storage_password,
                    },
                    timeout=10.0,
                )

                if response.status_code != 200:
                    logger.error(
                        f"Failed to get Dream Central Storage token: {response.status_code} - {response.text}"
                    )
                    return None

                token = response.json().get("access_token")
                return token

        except Exception as e:
            logger.error(f"Error getting Dream Central Storage token: {e}")
            return None

    async def check_existing_subscription(self, token: str) -> dict | None:
        """
        Check if webhook subscription already exists.

        Args:
            token: Dream Central Storage access token

        Returns:
            Existing subscription dict if found, None otherwise
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.dream_storage_url}/webhooks/",
                    headers={"Authorization": f"Bearer {token}"},
                    timeout=10.0,
                )

                if response.status_code != 200:
                    logger.error(
                        f"Failed to list webhook subscriptions: {response.status_code}"
                    )
                    return None

                subscriptions = response.json()

                # Check if our webhook URL is already registered
                for sub in subscriptions:
                    if sub.get("url") == self.webhook_url:
                        logger.info(
                            f"Found existing webhook subscription: ID={sub['id']}, Active={sub.get('is_active')}"
                        )
                        return sub

                return None

        except Exception as e:
            logger.error(f"Error checking existing webhook subscriptions: {e}")
            return None

    async def create_webhook_subscription(self, token: str) -> dict | None:
        """
        Create new webhook subscription with Dream Central Storage.

        Args:
            token: Dream Central Storage access token

        Returns:
            Created subscription dict if successful, None otherwise
        """
        try:
            payload = {
                "url": self.webhook_url,
                "secret": self.webhook_secret,
                "description": f"Dream LMS Auto-registered on startup - {settings.ENVIRONMENT}",
                "is_active": True,
                "event_types": "book.created,book.updated,book.deleted,publisher.created,publisher.updated,publisher.deleted",
            }

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.dream_storage_url}/webhooks/",
                    headers={"Authorization": f"Bearer {token}"},
                    json=payload,
                    timeout=10.0,
                )

                if response.status_code != 201:
                    logger.error(
                        f"Failed to create webhook subscription: {response.status_code} - {response.text}"
                    )
                    return None

                subscription = response.json()
                logger.info(
                    f"Created webhook subscription: ID={subscription['id']}, URL={subscription['url']}"
                )
                return subscription

        except Exception as e:
            logger.error(f"Error creating webhook subscription: {e}")
            return None

    async def update_webhook_subscription(
        self, token: str, subscription_id: int
    ) -> dict | None:
        """
        Update existing webhook subscription to ensure it's active.

        Args:
            token: Dream Central Storage access token
            subscription_id: ID of existing subscription

        Returns:
            Updated subscription dict if successful, None otherwise
        """
        try:
            payload = {
                "is_active": True,
                "secret": self.webhook_secret,  # Update secret in case it changed
            }

            async with httpx.AsyncClient() as client:
                response = await client.put(
                    f"{self.dream_storage_url}/webhooks/{subscription_id}",
                    headers={"Authorization": f"Bearer {token}"},
                    json=payload,
                    timeout=10.0,
                )

                if response.status_code != 200:
                    logger.error(
                        f"Failed to update webhook subscription: {response.status_code}"
                    )
                    return None

                subscription = response.json()
                logger.info(
                    f"Updated webhook subscription: ID={subscription['id']}, Active={subscription.get('is_active')}"
                )
                return subscription

        except Exception as e:
            logger.error(f"Error updating webhook subscription: {e}")
            return None

    async def register_webhook(self, force_recreate: bool = False) -> dict:
        """
        Register or update webhook subscription with Dream Central Storage.

        This is the main entry point that handles the full registration flow:
        1. Get Dream Central Storage token
        2. Check for existing subscription
        3. Create new or update existing subscription

        Args:
            force_recreate: If True, delete existing and create new subscription

        Returns:
            dict with status and details:
            {
                "success": bool,
                "subscription_id": int or None,
                "message": str,
                "subscription": dict or None
            }
        """
        try:
            # Step 1: Get token
            logger.info("Getting Dream Central Storage admin token...")
            token = await self.get_dream_storage_token()

            if not token:
                return {
                    "success": False,
                    "subscription_id": None,
                    "message": "Failed to authenticate with Dream Central Storage. Check credentials in .env file.",
                    "subscription": None,
                }

            # Step 2: Check existing subscription
            logger.info("Checking for existing webhook subscription...")
            existing = await self.check_existing_subscription(token)

            if existing:
                subscription_id = existing["id"]

                if force_recreate:
                    # Delete existing and create new
                    logger.info(f"Force recreate requested. Deleting subscription {subscription_id}...")
                    try:
                        async with httpx.AsyncClient() as client:
                            await client.delete(
                                f"{self.dream_storage_url}/webhooks/{subscription_id}",
                                headers={"Authorization": f"Bearer {token}"},
                                timeout=10.0,
                            )
                        logger.info("Deleted existing subscription")
                    except Exception as e:
                        logger.warning(f"Error deleting existing subscription: {e}")

                    # Create new
                    logger.info("Creating new webhook subscription...")
                    subscription = await self.create_webhook_subscription(token)

                    if subscription:
                        return {
                            "success": True,
                            "subscription_id": subscription["id"],
                            "message": f"Webhook subscription recreated successfully (ID: {subscription['id']})",
                            "subscription": subscription,
                        }
                    else:
                        return {
                            "success": False,
                            "subscription_id": None,
                            "message": "Failed to create new webhook subscription",
                            "subscription": None,
                        }

                else:
                    # Update existing to ensure it's active
                    logger.info(f"Updating existing subscription {subscription_id}...")
                    subscription = await self.update_webhook_subscription(
                        token, subscription_id
                    )

                    if subscription:
                        return {
                            "success": True,
                            "subscription_id": subscription["id"],
                            "message": f"Webhook subscription already exists and is active (ID: {subscription['id']})",
                            "subscription": subscription,
                        }
                    else:
                        return {
                            "success": False,
                            "subscription_id": subscription_id,
                            "message": "Failed to update existing webhook subscription",
                            "subscription": None,
                        }

            # Step 3: Create new subscription
            logger.info("No existing subscription found. Creating new...")
            subscription = await self.create_webhook_subscription(token)

            if subscription:
                return {
                    "success": True,
                    "subscription_id": subscription["id"],
                    "message": f"Webhook subscription created successfully (ID: {subscription['id']})",
                    "subscription": subscription,
                }
            else:
                return {
                    "success": False,
                    "subscription_id": None,
                    "message": "Failed to create webhook subscription",
                    "subscription": None,
                }

        except Exception as e:
            logger.error(f"Unexpected error during webhook registration: {e}")
            return {
                "success": False,
                "subscription_id": None,
                "message": f"Unexpected error: {str(e)}",
                "subscription": None,
            }


# Global instance
webhook_registration_service = WebhookRegistrationService()
