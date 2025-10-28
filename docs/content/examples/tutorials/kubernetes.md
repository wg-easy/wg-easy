---
title: Kubernetes
---

### Create a namespace

```yaml
# 01-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: wg-easy
```

### Create a PVC

```yaml
# 02-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: wg-config
  namespace: wg-easy
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: local-path
  resources:
    requests:
      storage: 100Mi
```


### Create the deployment

Note this example uses a host port. You could create a node port instead as well. Ensure that `INIT_PORT`, `containerPort` and `hostPort` coincide.  

The below is an example; please refer to [_Optional config_][docs-optional-config] and [_Unattended setup_][docs-unattended-setup] for all possible variables.

[docs-optional-config]: ../../advanced/config/optional-config.md
[docs-unattended-setup]: ../../advanced/config/unattended-setup.md

```yaml
# 03-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: wg-easy
  namespace: wg-easy
spec:
  replicas: 1
  revisionHistoryLimit: 1
  selector:
    matchLabels:
      app.kubernetes.io/name: wg-easy
  strategy:
    # Restrict to a Single wg-easy instance, on redeploys it will tear down the old one before bring a new one up.
    type: Recreate
  template:
    metadata:
      labels:
        app.kubernetes.io/name: wg-easy
    spec:
      containers:
        - name: wg-easy
          env:
            - name: INIT_ENABLED
              value: true
            - name: INIT_USERNAME
              value: admin
            - name: INIT_PASSWORD
              value: Chan9eM3L4t3r!
            - name: INIT_HOST
              value: wg.yourdomain.com
            - name: INIT_PORT
              value: "33333"
            - name: INIT_DNS
              value: "9.9.9.9,149.112.112.112"
          image: ghcr.io/wg-easy/wg-easy:15
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 33333
              hostPort: 33333
              protocol: UDP
            - containerPort: 51821
              name: http
              protocol: TCP
          # Use the http server for pod health checks
          livenessProbe:
            failureThreshold: 3
            periodSeconds: 10
            successThreshold: 1
            tcpSocket:
              port: http
            timeoutSeconds: 1
          readinessProbe:
            failureThreshold: 3
            periodSeconds: 10
            successThreshold: 1
            tcpSocket:
              port: http
            timeoutSeconds: 1
          startupProbe:
            failureThreshold: 30
            periodSeconds: 5
            successThreshold: 1
            tcpSocket:
              port: http
            timeoutSeconds: 1
          # Give pod permissions to modify iptables and load the wireguard kernel module
          securityContext:
            capabilities:
              add:
                - NET_ADMIN
                - SYS_MODULE
          # Persistent storage location
          volumeMounts:
            - mountPath: /etc/wireguard
              name: config
      restartPolicy: Always
      volumes:
        - name: config
          persistentVolumeClaim:
            claimName: wg-config
```

### Create a service
```yaml
# 04-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: wg-easy-http
  namespace: wg-easy
spec:
  ports:
    - name: http
      port: 51821
      protocol: TCP
      targetPort: http
  selector:
    app.kubernetes.io/name: wg-easy
  type: ClusterIP
  ``` 

### (optional) Create an ingress

For example, using `traefik` ingress class

```yaml
# 05-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: wg-easy
  namespace: wg-easy
spec:
  ingressClassName: traefik
  rules:
    - host: wg.yourdomain.com
      http:
        paths:
          - backend:
              service:
                name: wg-easy-http
                port:
                  name: http
            path: /
            pathType: Prefix
```

You should now be able to browse https://wg.yourdomain.com and set up your wireguard config.