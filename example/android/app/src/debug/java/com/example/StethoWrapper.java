package com.example;

import android.content.Context;
import com.facebook.stetho.*;
import com.facebook.stetho.okhttp3.StethoInterceptor;
// import com.facebook.stetho;
import okhttp3.*;
import com.facebook.react.modules.network.*;
// import com.facebook.stetho.Stetho;
// import com.facebook.stetho.okhttp;

public class StethoWrapper {

    public static void initialize(Context context) {
        Stetho.initializeWithDefaults(context);
        
        OkHttpClient client = OkHttpClientProvider.getOkHttpClient()
            .newBuilder()
            .addNetworkInterceptor(new StethoInterceptor())
            .build();
        
        OkHttpClientProvider.replaceOkHttpClient(client);
    }

    public static void addInterceptor() {
    //     OkHttpClient client = OkHttpClientProvider.getOkHttpClient()
    //         .newBuilder()
    //         .addNetworkInterceptor(new StethoInterceptor())
    //         .build();
         
    //     OkHttpClientProvider.replaceOkHttpClient(client);
    }

}